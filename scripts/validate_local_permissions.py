"""Valida ADMIN e VISUALIZADOR somente na API local de homologação."""
from pathlib import Path
import sys

import httpx
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
API_URL = 'http://127.0.0.1:15001'


def main() -> int:
    config = dotenv_values(ROOT / '.env.homologacao')
    required = ('RPA_API_EMAIL', 'RPA_API_PASSWORD',
                'HOMOLOGATION_VIEWER_EMAIL', 'HOMOLOGATION_VIEWER_PASSWORD')
    if config.get('RPA_API_URL') != API_URL or any(not config.get(name) for name in required):
        print('CONFIGURACAO_INCOMPLETA: execute scripts/prepare_homologation.py.')
        return 2
    try:
        with httpx.Client(base_url=API_URL, timeout=20, trust_env=False) as client:
            health = client.get('/api/health')
            health.raise_for_status()
            if health.json().get('environment') != 'homologacao-local':
                raise ValueError('Ambiente incorreto')

            admin_login = client.post('/api/auth/login', json={
                'email': config['RPA_API_EMAIL'], 'password': config['RPA_API_PASSWORD']})
            admin_login.raise_for_status()
            admin_headers = {'Authorization': 'Bearer ' + admin_login.json()['access_token']}
            admin_me = client.get('/api/auth/me', headers=admin_headers)
            if admin_me.status_code != 200 or admin_me.json().get('role') != 'ADMIN':
                raise ValueError('Perfil ADMIN inválido')

            created = client.post('/api/users', headers=admin_headers, json={
                'email': config['HOMOLOGATION_VIEWER_EMAIL'],
                'password': config['HOMOLOGATION_VIEWER_PASSWORD'],
                'name': 'Visualizador Homologacao', 'role_name': 'VISUALIZADOR',
            })
            if created.status_code not in (201, 409):
                raise ValueError('ADMIN não conseguiu preparar VISUALIZADOR')

            viewer_login = client.post('/api/auth/login', json={
                'email': config['HOMOLOGATION_VIEWER_EMAIL'],
                'password': config['HOMOLOGATION_VIEWER_PASSWORD'],
            })
            viewer_login.raise_for_status()
            viewer_headers = {'Authorization': 'Bearer ' + viewer_login.json()['access_token']}
            viewer_me = client.get('/api/auth/me', headers=viewer_headers)
            if viewer_me.status_code != 200 or viewer_me.json().get('role') != 'VISUALIZADOR':
                raise ValueError('Perfil VISUALIZADOR inválido')

            kpis = client.get('/api/kpis/logistic_cost', params={'month': 'Jan', 'year': 'Y26'},
                              headers=viewer_headers)
            if kpis.status_code != 200 or len(kpis.json()) != 1:
                raise ValueError('VISUALIZADOR não conseguiu consultar KPI')

            blocked_user = client.post('/api/users', headers=viewer_headers, json={
                'email': 'nao-criar@example.com', 'password': 'blocked-password',
                'role_name': 'ADMIN'})
            blocked_analysis = client.get('/api/analysis/logistic_cost/anomalias', headers=viewer_headers)
            if (blocked_user.status_code, blocked_analysis.status_code) != (403, 403):
                raise ValueError('VISUALIZADOR obteve permissão administrativa')

            if client.get('/api/kpis/logistic_cost').status_code != 401:
                raise ValueError('Rota aceitou acesso sem token')
            if client.get('/api/kpis/logistic_cost',
                          headers={'Authorization': 'Bearer token-invalido'}).status_code != 401:
                raise ValueError('Rota aceitou token inválido')
            wrong = client.post('/api/auth/login', json={
                'email': config['HOMOLOGATION_VIEWER_EMAIL'], 'password': 'senha-incorreta'})
            if wrong.status_code != 401 or 'access_token' in wrong.json():
                raise ValueError('Login incorreto não foi rejeitado')

        print('APROVADO: permissões na API local de homologação.')
        print('ADMIN: login e cadastro de VISUALIZADOR aprovados.')
        print('VISUALIZADOR: login e leitura de Jan/Y26 aprovados.')
        print('VISUALIZADOR: cadastro de usuário e análise administrativa bloqueados com 403.')
        print('Sem token, token inválido e senha incorreta bloqueados com 401.')
        print('Credenciais preservadas em .env.homologacao; nenhuma senha exibida.')
        return 0
    except Exception as error:
        print('FALHA: ' + type(error).__name__ + '. Confira Docker e a configuração local.')
        return 1


if __name__ == '__main__':
    sys.exit(main())
