# Homologação e aceite com usuários

Este documento registra o aceite funcional do dashboard por um representante do negócio. Os testes técnicos já executados não substituem este aceite. Não incluir senhas, tokens, conteúdo de `.env` ou dados pessoais nas evidências.


Os testes técnicos do RPA precedem o aceite pelo negócio: use destinatários de
teste e desabilite `send_log`, se existir nesse caminho. Após a validação técnica,
organize a sessão com o responsável do negócio; não envie dados sintéticos ao
usuário final automaticamente. Essa separação corresponde aos requisitos
registrados no [Épico 7](../history/epic-7-validation.md#requisitos-adicionais-do-guia-dxi).
Os registros históricos não substituem uma sessão executada na versão atual.

## Identificação da sessão

| Campo | Preenchimento |
| --- | --- |
| Projeto | Logistics Cost Dashboard |
| Data e horário | A preencher |
| Ambiente | Homologação |
| URL | A preencher |
| Versão/commit | A preencher |
| Responsável técnico | A preencher |
| Usuário homologador / área | A preencher |
| Perfil utilizado | Registrar o papel efetivo; padrão atual: ADMIN / GESTOR / TI_SUPORTE / AUDITORIA / VIEWER |

## Pré-condições

- [ ] Ambiente identificado como homologação, sem conexão com produção.
- [ ] Dados de referência aprovados pelo responsável do negócio.
- [ ] Credencial individual ou temporária entregue por canal seguro.
- [ ] Nenhuma senha ou token aparece em captura de tela.
- [ ] Não existem defeitos críticos ou altos abertos.

Os valores 5,00%/4,00%/80% abaixo pertencem ao anexo sintético Jan/Y26 da
homologação, não à carga histórica padrão. Prepare essa referência antes do teste.
Os registros antigos usavam VISUALIZADOR; a matriz padrão atual usa VIEWER.
Para dados recebidos por e-mail, confirme o aceite da fila antes da comparação.

## Cenários de aceite

| ID | Cenário | Resultado esperado | Resultado observado | Situação | Evidência/defeito |
| --- | --- | --- | --- | --- | --- |
| HU-01 | Login válido | Usuário entra e seu perfil correto aparece no cabeçalho | A preencher | Pendente | |
| HU-02 | Login inválido | Sistema recusa credencial incorreta sem criar sessão | A preencher | Pendente | |
| HU-03 | Visão Geral Jan/26 | War Room mostra resultado 5,00%, meta 4,00% e atingimento 80% | A preencher | Pendente | |
| HU-04 | Dados ausentes | Indicadores e períodos sem dados mostram `—`, sem valores demonstrativos | A preencher | Pendente | |
| HU-05 | Gráfico War Room | Gráfico representa Jan/26 com 5,00% e meta 4,00% | A preencher | Pendente | |
| HU-06 | Filtros | Seleção mensal funciona e não inventa dados nos demais períodos | A preencher | Pendente | |
| HU-07 | Perfil VIEWER | Consulta painéis, mas não vê Analytics | A preencher | Pendente | |
| HU-08 | Perfil ADMIN | Consulta painéis e acessa Analytics | A preencher | Pendente | |
| HU-09 | Saída | Botão Sair encerra a sessão e retorna ao login | A preencher | Pendente | |
| HU-10 | Clareza e usabilidade | Rótulos, unidades e navegação são compreensíveis para o negócio | A preencher | Pendente | |

Situação permitida: **Aprovado**, **Reprovado** ou **Não executado**. Todo cenário reprovado deve indicar defeito, severidade e passos de reprodução.

## Defeitos e ressalvas

| ID | Descrição | Severidade | Responsável | Prazo | Resultado da reexecução |
| --- | --- | --- | --- | --- | --- |
| A preencher | | | | | |

Ressalva técnica conhecida: a comparação com Jan/25 ainda usa o texto “Mês passado”, embora represente o mesmo mês do ano anterior. Definir com o responsável se esse ajuste impede o aceite.

## Decisão

Marcar somente após executar os cenários obrigatórios:

- [ ] **APROVADO** — apto para seguir ao processo autorizado de produção.
- [ ] **APROVADO COM RESSALVAS** — somente defeitos sem impacto crítico/alto, listados acima.
- [ ] **REPROVADO** — correção e nova homologação obrigatórias.

Observações da decisão:

> A preencher.

| Papel | Nome | Data | Confirmação/assinatura |
| --- | --- | --- | --- |
| Usuário homologador / area owner | A preencher | A preencher | A preencher |
| Responsável técnico | A preencher | A preencher | A preencher |
| Product owner, se aplicável | A preencher | A preencher | A preencher |

## Evidências a guardar

- Capturas do login e dos valores aprovados, sem credenciais.
- Identificação da versão ou commit testado.
- Saída dos testes automatizados relacionada à versão.
- Lista de defeitos e resultados das reexecuções.
- Este termo preenchido e confirmado pelo responsável do negócio.

Somente após a decisão **APROVADO** ou **APROVADO COM RESSALVAS** aceita pelo time, atualizar o item “Realizar homologação com usuários” do Épico 7. A produção continua sendo uma etapa separada e exige autorização própria.

## Validação técnica antes do aceite

Pré-condições: ambiente separado, banco de teste, caixa postal dedicada, ADMIN de teste, versão/commit registrados, robô/API/dashboard em execução. Usar dados sintéticos; não registrar senhas ou tokens nas evidências.

1. Confirmar FastAPI no ambiente e o caminho do robô até a API/banco. Registrar URLs, versão e configuração sem segredos. Bloquear envio ao usuário final e desabilitar `send_log` no caminho de testes, se existente.
2. Preparar Excel de referência com mês/ano aceitos, KPI identificado pelo nome/aba e valores conhecidos (ex.: target 0.04, result 0.05, achievement 0.8). Registrar formato percentual esperado na tela.
3. Enviar para a caixa de teste com assunto/remetente permitidos e Message-ID único. Registrar horário e identificador.
4. Executar o robô, conferir anexos, logs e a fila `pending`; revisar e aceitar o lote com papel autorizado. Só então conferir persistência e dashboard. Nenhum erro deve ser mascarado como sucesso.
5. Fazer login no dashboard. Conferir valores na resposta da API e na tela, período, unidades, arredondamento e ausência de dados mock substituindo silenciosamente os reais.
6. Reexecutar o mesmo e-mail. Confirmar que a contagem de registros não aumenta. Enviar outro Message-ID para o mesmo período com valor corrigido e confirmar a regra de atualização acordada.
7. Repetir com assunto inválido, anexo corrompido, campo obrigatório ausente e falha de banco/API. Exigir erro rastreável, ausência de dados parciais e possibilidade de reprocessamento quando aplicável.
8. Testar saída da sessão, acesso sem token, token expirado e acesso não autorizado às rotas administrativas. Não criar perfis novos em produção só para testar.
9. Anexar evidências e abrir defeitos com passos de reprodução. Reexecutar após correção.


## Validação de produção — somente com autorização

Antes do deploy: aprovação da mudança, backup/restauração verificados, migrations revisadas, plano de rollback com responsável, segredos fora do repositório, JWT_SECRET próprio, HTTPS, origem CORS e proxy conferidos.

Após deploy, iniciar com verificações de leitura: health (não comprova banco), login autorizado, resposta dos KPIs, renderização e logs sem segredos. Não fazer testes de carga, falha induzida, alteração de permissões ou envio de dados fictícios sem autorização específica. Se permitido, usar um relatório controlado e rastreável para confirmar o fluxo completo, com plano de limpeza aprovado.

Registrar versão, horário, responsáveis, evidências e decisão de manter/reverter. Sem acesso e execução reais, marcar produção como **pendente**, nunca aprovada por inferência dos testes locais.

Use secrets da plataforma, certificado/domínio reais e backup automatizado do
PostgreSQL. O frontend atual não usa `VITE_ALLOW_MOCK_FALLBACK`; sem API não há
fallback de números locais.
