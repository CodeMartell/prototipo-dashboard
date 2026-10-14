import os
import json
import hashlib
from datetime import datetime
from typing import Any, Dict, List, Tuple
import pandas as pd


class DataStorage:
    """
    Gerencia a persistência dos dados consolidados em JSON e CSV,
    além de garantir o controle de duplicidade de processamento.
    """

    def __init__(self, pasta_saida: str = "dados_processados", prefixo: str = "kpi_consolidado"):
        self.pasta_saida = pasta_saida
        self.prefixo = prefixo
        self.caminho_registro = os.path.join(self.pasta_saida, ".processed_registry.json")
        os.makedirs(self.pasta_saida, exist_ok=True)
        self._carregar_registro()

    def _carregar_registro(self):
        """Carrega a base de controle anti-duplicidade."""
        if os.path.exists(self.caminho_registro):
            try:
                with open(self.caminho_registro, "r", encoding="utf-8") as f:
                    self.registro = json.load(f)
            except Exception:
                self.registro = {}
        else:
            self.registro = {}

    def _salvar_registro(self):
        """Salva a base de controle anti-duplicidade."""
        with open(self.caminho_registro, "w", encoding="utf-8") as f:
            json.dump(self.registro, f, ensure_ascii=False, indent=2)

    def calcular_hash_arquivo(self, caminho_arquivo: str) -> str:
        """Gera hash SHA-256 de um arquivo para detecção de duplicidade de conteúdo."""
        sha256 = hashlib.sha256()
        with open(caminho_arquivo, "rb") as f:
            for bloco in iter(lambda: f.read(65536), b""):
                sha256.update(bloco)
        return sha256.hexdigest()

    def ja_foi_processado(self, identificador: str) -> bool:
        """Verifica se um ID de e-mail ou hash de arquivo já foi processado com sucesso."""
        return identificador in self.registro

    def salvar_dados(
        self,
        metadata: Dict[str, Any],
        indicadores: Dict[str, List[Dict[str, Any]]],
        salvar_csv: bool = True
    ) -> Tuple[str, List[str]]:
        """
        Salva os dados consolidados no formato JSON padrão e exporta CSVs por indicador.
        """
        timestamp = datetime.now().strftime("%Y_%m_%d_%H%M%S")
        nome_base_json = f"{self.prefixo}_{timestamp}.json"
        caminho_json = os.path.join(self.pasta_saida, nome_base_json)

        payload_saida = {
            "metadata": {
                "origem_email": metadata.get("origem_email", "desconhecido"),
                "assunto": metadata.get("assunto", "Sem Assunto"),
                "data_processamento": datetime.utcnow().isoformat() + "Z",
                "status_qualidade": metadata.get("status_qualidade", "100% Válido")
            },
            "indicadores": indicadores
        }

        # Salva o arquivo JSON consolidado
        with open(caminho_json, "w", encoding="utf-8") as f:
            json.dump(payload_saida, f, ensure_ascii=False, indent=2)

        arquivos_csv_gerados = []

        # Exporta CSVs individuais se habilitado
        if salvar_csv:
            for kpi_nome, lista_dados in indicadores.items():
                if lista_dados:
                    nome_csv = f"{self.prefixo}_{kpi_nome}_{timestamp}.csv"
                    caminho_csv = os.path.join(self.pasta_saida, nome_csv)
                    df = pd.DataFrame(lista_dados)
                    df.to_csv(caminho_csv, index=False, encoding="utf-8-sig")
                    arquivos_csv_gerados.append(caminho_csv)

        return caminho_json, arquivos_csv_gerados

    def registrar_sucesso(self, identificador: str, metadata: Dict[str, Any], arquivo_json: str):
        """Registra o identificador na base anti-duplicidade."""
        self.registro[identificador] = {
            "origem": metadata.get("origem_email"),
            "assunto": metadata.get("assunto"),
            "data_processamento": datetime.utcnow().isoformat() + "Z",
            "arquivo_saida": os.path.basename(arquivo_json)
        }
        self._salvar_registro()
