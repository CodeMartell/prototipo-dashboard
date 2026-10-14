# Documentação do DataLens

Escolha o documento pela tarefa. Comandos atuais ficam nos guias; evidências
com data ficam no histórico e não comprovam o estado da versão atual.

| Necessidade | Fonte principal |
| --- | --- |
| Instalar, executar, carregar dados, testar RPA e diagnosticar | [Guia de desenvolvimento](guides/development.md) |
| Entender formatos, regras e aprovação da ingestão | [Arquitetura de ingestão](architecture/email-ingestion.md) |
| Executar a integração HTTP/PostgreSQL isolada | [Testes de integração](testing/integration.md) |
| Validar tecnicamente, registrar aceite e preparar produção | [Homologação e aceite](testing/acceptance.md) |
| Consultar decisões, requisitos DXi e evidências de agosto/2026 | [Histórico do Épico 7](history/epic-7-validation.md) |
| Consultar o relatório de segurança da entrega anterior | [Histórico do Épico 5](history/epic-5-security.md) |
| Consultar a proposta original de idiomas | [Proposta i18n](history/i18n-proposal.md) |
| Consultar o relatório de integração Desktop e Web (outubro/2026) | [Integração Desktop e Web](history/integracao-desktop-web.md) |
| Consultar o desenho C4 | [Diagrama editável](architecture/Prototipo-DX_C4-Models-N1.drawio) · [Imagem](architecture/Prototipo-DX_C4-Models-N1.png) |

A visão geral, KPIs e matriz RBAC estão no [README principal](../README.md).
Os detalhes dos componentes ficam em [backend](../server/README.md),
[frontend](../dashboard/README.md) e [bot legado](../bot-extrator-email/README.md).
A localização e o uso das ferramentas auxiliares ficam no
[índice de scripts](../scripts/README.md).

## Organização e manutenção

```text
docs/
├── architecture/  # Estrutura e decisões técnicas vigentes, formatos e C4
├── guides/        # Procedimentos de desenvolvimento e operação local
├── testing/       # Integração, validação técnica e formulário de aceite
└── history/       # Evidências datadas e propostas preservadas
```

- Mantenha uma fonte principal por assunto. Outros documentos apontam para ela;
  não copie comandos ou resultados apenas para torná-los autocontidos.
- Atualize o guia atual quando um serviço, porta, contrato ou caminho mudar.
  Evidências anteriores conservam a data, versão conhecida e limitações.
- Registre resultados apenas após execução. Campos de aceite ficam pendentes
  até a confirmação de um representante real do negócio.
- Ao mover arquivos, atualize links relativos, imports, caminhos de scripts e
  referências de build/CI no mesmo conjunto de alterações.
- Preserve a separação dos componentes: a API contém controllers, services e
  repositories; o RPA comunica-se por HTTP; o frontend concentra apresentação
  e cliente HTTP. Seeds e migrations continuam com o backend.
- Testes unitários continuam junto a `server/` e `rpa_email/`; integração entre
  componentes fica em `tests/system/`. Scripts de diagnóstico e envio manual
  não são suites de teste nem devem rodar automaticamente na CI.
- `scratch/` conserva explorações e planilhas históricas, fora dos contextos
  Docker e da descoberta de testes. O bot autônomo do Épico 3 continua separado
  do RPA integrado. Não reutilize essas áreas como dependência de produção.

Esses critérios definem a organização deste repositório; não representam
certificação de conformidade integral com o guia corporativo DXi. As exceções,
requisitos externos e aceites pendentes continuam no histórico do Épico 7.
