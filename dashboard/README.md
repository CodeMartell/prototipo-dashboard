# DataLens — Dashboard React

Interface React 19 com Vite, Recharts, exportação CSV/XLSX e tradução por
`i18next`/`react-i18next`. Para instalar e validar a aplicação completa, siga o
[roteiro de execução e testes](../docs/guides/development.md).

## Comandos do frontend

Dentro de `dashboard/`, após `npm ci`:

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Vite em `http://localhost:5173`, proxy `/api` → `localhost:5001` |
| `npm run dev:homologacao` | Vite em `http://127.0.0.1:15173`, proxy → `127.0.0.1:15001` |
| `npm test` | Testes com o runner nativo `node --test` |
| `npm run lint` | Verificação com Oxlint |
| `npm run build` | Bundle de produção em `dist/` |
| `npm run preview` | Prévia do bundle; não substitui a configuração do proxy da API |

No Docker principal, `nginx.conf` serve a SPA em `localhost:5173` e encaminha
`/api` para `api:5001`. O navegador usa a mesma origem. No desenvolvimento, os
proxies e portas estão em [`vite.config.js`](vite.config.js). A interface depende
da API; a ausência de dados não deve ser preenchida com números demonstrativos.

## Estrutura e idiomas

`src/App.jsx` compõe o dashboard; `src/pages/` contém login, perfil, usuários e
auditoria. `src/components/` concentra os componentes, `src/services/` o cliente
HTTP e permissões, e `src/utils/` os cálculos e exportação.

[`src/i18n.js`](src/i18n.js) é importado por `src/main.jsx` e registra `pt`, `en`
e `ko`, com idioma inicial e fallback `en`. Os textos ficam em
`src/locales/{pt,en,ko}.json`; o seletor fica dentro de `Header.jsx` e chama
`i18n.changeLanguage`. Ao acrescentar texto, mantenha as três traduções e confira
o layout. A [proposta original](../docs/history/i18n-proposal.md) permanece
como registro histórico; ela não é uma lista de instalações ainda pendentes.
