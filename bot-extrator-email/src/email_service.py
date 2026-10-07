import os
import imaplib
import email
from email.header import decode_header
from typing import Any, Dict, Generator, List, Optional
from datetime import datetime


def decodificar_cabecalho(texto: Optional[str]) -> str:
    """Decodifica cabeçalhos de e-mail (Assunto, De, etc.) para UTF-8."""
    if not texto:
        return ""
    partes_decodificadas = decode_header(texto)
    resultado = ""
    for parte, encoding in partes_decodificadas:
        if isinstance(parte, bytes):
            try:
                resultado += parte.decode(encoding or "utf-8", errors="replace")
            except Exception:
                resultado += parte.decode("latin-1", errors="replace")
        else:
            resultado += str(parte)
    return resultado


class EmailService:
    """
    Serviço de extração de e-mails com suporte a Modo Real (IMAP) e Modo Simulação (Offline).
    """

    def __init__(self, config_filtros: Dict[str, Any], pasta_entrada: str = "caixa_de_entrada"):
        self.filtros = config_filtros
        self.pasta_entrada = pasta_entrada
        self.termos_assunto = [t.lower() for t in self.filtros.get("termos_assunto_obrigatorios", [])]
        self.remetentes_autorizados = [r.lower() for r in self.filtros.get("remetentes_autorizados", [])]
        self.extensoes_permitidas = tuple(self.filtros.get("extensoes_anexos_permitidas", [".xlsx", ".xls"]))

    def assunto_eh_valido(self, assunto: str) -> bool:
        """Verifica se o assunto do e-mail contém algum dos termos-chave configurados."""
        assunto_lower = assunto.lower()
        return any(termo in assunto_lower for termo in self.termos_assunto)

    def remetente_eh_valido(self, remetente: str) -> bool:
        """Verifica se o remetente é autorizado (ou se a lista está vazia para testes)."""
        if not self.remetentes_autorizados:
            return True
        remetente_lower = remetente.lower()
        return any(autorizado in remetente_lower for autorizado in self.remetentes_autorizados)

    def obter_mensagens_simuladas(self) -> Generator[Dict[str, Any], None, None]:
        """
        Lê arquivos de simulação na pasta caixa_de_entrada/ e simula a recepção de e-mails corporativos.
        """
        os.makedirs(self.pasta_entrada, exist_ok=True)
        arquivos = [
            f for f in os.listdir(self.pasta_entrada)
            if f.lower().endswith(self.extensoes_permitidas) and not f.startswith("~")
        ]

        for nome_arquivo in arquivos:
            caminho_completo = os.path.join(self.pasta_entrada, nome_arquivo)
            assunto_simulado = f"[Fechamento Logístico] Relatório DXI - {nome_arquivo}"
            remetente_simulado = "financeiro.dxi@lge.com"

            # Gera um identificador único de simulação baseado no nome do arquivo
            email_id = f"simulated_{nome_arquivo}"

            yield {
                "id": email_id,
                "origem_email": remetente_simulado,
                "assunto": assunto_simulado,
                "data_envio": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "anexos": [
                    {
                        "nome": nome_arquivo,
                        "caminho": caminho_completo,
                        "tamanho_bytes": os.path.getsize(caminho_completo)
                    }
                ],
                "modo": "SIMULAÇÃO"
            }

    def obter_mensagens_reais(
        self,
        servidor: str,
        porta: int,
        usuario: str,
        senha: str,
        pasta_imap: str = "INBOX",
        pasta_temp: str = "caixa_de_entrada",
        limite_mensagens: int = 50,
        callback_status=None
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Conecta via IMAP SSL ao servidor de e-mail e processa e-mails não lidos de forma ultrarrápida.
        Lê apenas os cabeçalhos primeiro (BODY.PEEK) e baixa anexos somente das mensagens correspondentes.
        """
        try:
            conexao = imaplib.IMAP4_SSL(servidor, porta)
            conexao.login(usuario, senha)
            conexao.select(pasta_imap)
        except Exception as e:
            if callback_status:
                callback_status(f"Falha na autenticação IMAP: {e}")
            raise e

        # 1. Busca rápida indexada no servidor IMAP pelos termos de assunto
        mensagens_encontradas = set()
        
        # Busca direta pelos termos configurados no servidor (instantâneo no Gmail)
        for termo in self.termos_assunto[:3]:
            try:
                status_kw, ids_kw = conexao.search(None, f'(SUBJECT "{termo}")')
                if status_kw == "OK" and ids_kw[0]:
                    for m_id in ids_kw[0].split():
                        mensagens_encontradas.add(m_id)
            except Exception:
                pass

        # Busca complementar por mensagens não lidas
        try:
            status_unseen, ids_unseen = conexao.search(None, "UNSEEN")
            if status_unseen == "OK" and ids_unseen[0]:
                for m_id in ids_unseen[0].split()[-30:]:
                    mensagens_encontradas.add(m_id)
        except Exception:
            pass

        if not mensagens_encontradas:
            if callback_status:
                callback_status("Nenhum e-mail correspondente aos filtros encontrado na caixa de entrada.")
            try:
                conexao.close()
                conexao.logout()
            except Exception:
                pass
            return

        # Ordena IDs numericamente (mais recentes primeiro)
        ids_ordenados = sorted(list(mensagens_encontradas), key=lambda x: int(x) if x.isdigit() else 0, reverse=True)[:limite_mensagens]

        if callback_status:
            callback_status(f"Localizadas {len(ids_ordenados)} mensagem(ns) correspondente(s). Analisando...")

        os.makedirs(pasta_temp, exist_ok=True)

        for idx, num in enumerate(ids_ordenados, 1):
            num_str = num.decode() if isinstance(num, bytes) else str(num)
            
            # 1. Busca LEVE apenas do cabeçalho (sem baixar o corpo/anexos pesados)
            status, header_data = conexao.fetch(num, "(BODY.PEEK[HEADER.FIELDS (SUBJECT FROM DATE)])")
            if status != "OK" or not header_data or not header_data[0]:
                continue

            raw_header = header_data[0][1]
            msg_header = email.message_from_bytes(raw_header)

            assunto = decodificar_cabecalho(msg_header.get("Subject"))
            remetente = decodificar_cabecalho(msg_header.get("From"))
            data_envio = decodificar_cabecalho(msg_header.get("Date"))

            # Valida filtros de assunto e remetente
            if not self.assunto_eh_valido(assunto):
                continue
            if not self.remetente_eh_valido(remetente):
                continue

            if callback_status:
                callback_status(f"Mensagem compatível encontrada: '{assunto}'. Baixando anexos...")

            # 2. Agora que o assunto deu match, baixa a mensagem completa e anexos
            status_full, full_data = conexao.fetch(num, "(RFC822)")
            if status_full != "OK" or not full_data:
                continue

            raw_email = full_data[0][1]
            msg = email.message_from_bytes(raw_email)
            anexos = []

            for parte in msg.walk():
                if parte.get_content_maintype() == "multipart":
                    continue
                if parte.get("Content-Disposition") is None:
                    continue

                nome_arquivo = decodificar_cabecalho(parte.get_filename())
                if nome_arquivo and nome_arquivo.lower().endswith(self.extensoes_permitidas):
                    caminho_salvar = os.path.join(pasta_temp, f"email_{num_str}_{nome_arquivo}")
                    with open(caminho_salvar, "wb") as f:
                        f.write(parte.get_payload(decode=True))

                    anexos.append({
                        "nome": nome_arquivo,
                        "caminho": caminho_salvar,
                        "tamanho_bytes": os.path.getsize(caminho_salvar)
                    })

            if anexos:
                yield {
                    "id": f"imap_{num_str}",
                    "origem_email": remetente,
                    "assunto": assunto,
                    "data_envio": data_envio,
                    "anexos": anexos,
                    "modo": "REAL",
                    "_imap_msg_num": num
                }

        try:
            conexao.close()
            conexao.logout()
        except Exception:
            pass

