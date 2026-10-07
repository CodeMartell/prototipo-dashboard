"""Gera credenciais locais exclusivas da homologação sem exibi-las."""
import secrets
from pathlib import Path
from dotenv import dotenv_values

root = Path(__file__).resolve().parents[1]
path = root / '.env.homologacao'
existing = dotenv_values(path) if path.exists() else {}
required = {
    'RPA_API_URL': 'http://127.0.0.1:15001',
    'RPA_API_EMAIL': 'bot-homologacao@example.com',
    'RPA_API_PASSWORD': secrets.token_urlsafe(32),
    'JWT_SECRET': secrets.token_urlsafe(48),
    'HOMOLOGATION_VIEWER_EMAIL': 'visualizador-homologacao@example.com',
    'HOMOLOGATION_VIEWER_PASSWORD': secrets.token_urlsafe(32),
}
missing = [(name, value) for name, value in required.items() if not existing.get(name)]
if missing:
    with path.open('a', encoding='utf-8') as output:
        if path.exists() and path.stat().st_size:
            output.write('\n')
        for name, value in missing:
            output.write(f'{name}={value}\n')
    print('Configuracao de homologacao completada. Credenciais nao exibidas.')
else:
    print('Configuracao de homologacao ja existe e esta completa; preservada.')
