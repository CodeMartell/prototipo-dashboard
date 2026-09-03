r"""Valida somente o anexo sintético do Épico 7, sem API/banco ou envio de e-mails.

Execute da raiz: .venv\Scripts\python.exe scripts/validate_gmail_test.py
Credenciais são lidas do .env e nunca impressas.
"""
import imaplib
import logging
import math
import sys
import tempfile
from email import message_from_bytes, policy
from pathlib import Path

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from rpa_email.extractors import KpiExtractor

SUBJECT = 'Relatorio Logistico - TESTE EPICO 7'
MAX_BYTES = 5 * 1024 * 1024


def main(ingest_local=False):
    config = dotenv_values(ROOT / '.env')
    if not config.get('EMAIL_USER') or not config.get('EMAIL_PASSWORD'):
        print('CONFIGURACAO_INCOMPLETA: confira EMAIL_USER e EMAIL_PASSWORD no .env.')
        return 2
    client = None
    abort_connection = False
    previous_logging_level = logging.root.manager.disable
    logging.disable(logging.CRITICAL)  # Evita detalhes do conteúdo nos logs do extrator.
    try:
        print('Conectando ao Gmail (limite de 20 s por espera de rede)...', flush=True)
        client = imaplib.IMAP4_SSL('imap.gmail.com', 993, timeout=20)
        client.login(config['EMAIL_USER'], config['EMAIL_PASSWORD'])
        print('Autenticacao aprovada. Buscando somente a mensagem de teste...', flush=True)
        status, _ = client.select('INBOX', readonly=True)
        if status != 'OK':
            raise ValueError('INBOX indisponível')
        status, data = client.uid('search', None, 'SUBJECT', f'"{SUBJECT}"')
        if status != 'OK':
            raise ValueError('Busca indisponível')
        uids = data[0].split() if data and data[0] else []
        selected = None
        # SUBJECT do IMAP busca substring: confirmar assunto exato antes do corpo.
        for uid in reversed(uids[-10:]):
            print('Conferindo assunto da mensagem candidata...', flush=True)
            status, parts = client.uid('fetch', uid, '(BODY.PEEK[HEADER.FIELDS (SUBJECT)])')
            if status != 'OK':
                continue
            headers = next((p[1] for p in parts if isinstance(p, tuple)), None)
            if headers and str(message_from_bytes(headers, policy=policy.default).get('Subject', '')).strip() == SUBJECT:
                selected = uid
                break
        if selected is None:
            print('NAO_ENCONTRADO: confirme o assunto exato e a chegada da mensagem na INBOX.')
            return 3
        print('Mensagem localizada. Baixando o anexo para validacao...', flush=True)
        status, parts = client.uid('fetch', selected, f'(BODY.PEEK[]<0.{MAX_BYTES + 1}>)')
        raw = next((p[1] for p in parts if isinstance(p, tuple)), None) if status == 'OK' else None
        if not raw or len(raw) > MAX_BYTES:
            print('MENSAGEM_INVALIDA: nao recebida ou acima do limite de 5 MB.')
            return 4
        message = message_from_bytes(raw, policy=policy.default)
        attachments = [p for p in message.walk() if p.get_content_disposition() == 'attachment'
                       and p.get_filename() == 'logistic_cost.xlsx']
        if len(attachments) != 1:
            print('ANEXO_INVALIDO: esperado exatamente um anexo chamado logistic_cost.xlsx.')
            return 5
        base = ROOT / 'rpa_email/resources/attachments/gmail-validation'
        base.mkdir(parents=True, exist_ok=True)
        destination = Path(tempfile.mkdtemp(prefix='test-', dir=base))
        (destination / 'logistic_cost.xlsx').write_bytes(attachments[0].get_payload(decode=True) or b'')
        result = KpiExtractor(destination).extract()
        if result.errors or len(result.logistic_cost) != 1:
            print('EXTRACAO_INVALIDA: esperado um unico registro de custo logistico.')
            return 6
        row = result.logistic_cost[0]
        if (row.month, row.year) != ('Jan', 'Y26') or not all(
            math.isclose(actual, expected, abs_tol=1e-9)
            for actual, expected in [(row.target, 0.04), (row.result, 0.05), (row.achievement, 0.8)]
        ):
            print('VALORES_DIVERGENTES: o anexo nao corresponde aos valores sinteticos combinados.')
            return 7
        print('APROVADO: Gmail -> mensagem de teste -> anexo Excel -> extrator do projeto.')
        print('Valores conferidos: Jan | Y26 | target=0.04 | result=0.05 | achievement=0.8')
        print('Anexo salvo em: ' + str(destination.relative_to(ROOT) / 'logistic_cost.xlsx'))
        if ingest_local:
            from scripts.ingest_validated_test import ingest_and_verify
            ingest_and_verify(message, result)
            print('Mensagem preservada; dados enviados somente a homologacao local. React ainda nao validado.')
        else:
            print('Nenhuma mensagem alterada; nenhum envio para API ou banco.')
        return 0
    except KeyboardInterrupt:
        abort_connection = True
        print('\nCANCELADO: execucao interrompida. Se iniciou ingestao, repetir com o mesmo Message-ID para conferir o resultado.')
        return 130
    except TimeoutError:
        abort_connection = True
        print('TEMPO_LIMITE: Gmail nao respondeu dentro do limite de espera. Tente novamente.')
        return 8
    except Exception as error:
        # Não imprimir respostas do servidor, credenciais nem conteúdo da mensagem.
        print('FALHA: ' + type(error).__name__ + '. Verifique conexao, credenciais e formato do anexo.')
        return 1
    finally:
        if client is not None:
            try:
                if abort_connection:
                    client.shutdown()
                else:
                    client.socket().settimeout(2)
                    client.logout()
            except (Exception, KeyboardInterrupt):
                try:
                    client.shutdown()
                except (Exception, KeyboardInterrupt):
                    pass
        logging.disable(previous_logging_level)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ingest-local', action='store_true', help='Envia o anexo validado apenas a API local de homologacao e confere duplicidade')
    sys.exit(main(ingest_local=parser.parse_args().ingest_local))
