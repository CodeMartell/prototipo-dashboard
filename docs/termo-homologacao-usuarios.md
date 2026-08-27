# Termo de Homologação com Usuários — Épico 7

Este documento registra o aceite funcional do dashboard por um representante do negócio. Os testes técnicos já executados não substituem este aceite. Não incluir senhas, tokens, conteúdo de `.env` ou dados pessoais nas evidências.

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
| Perfil utilizado | ADMIN / VISUALIZADOR |

## Pré-condições

- [ ] Ambiente identificado como homologação, sem conexão com produção.
- [ ] Dados de referência aprovados pelo responsável do negócio.
- [ ] Credencial individual ou temporária entregue por canal seguro.
- [ ] Nenhuma senha ou token aparece em captura de tela.
- [ ] Não existem defeitos críticos ou altos abertos.

## Cenários de aceite

| ID | Cenário | Resultado esperado | Resultado observado | Situação | Evidência/defeito |
| --- | --- | --- | --- | --- | --- |
| HU-01 | Login válido | Usuário entra e seu perfil correto aparece no cabeçalho | A preencher | Pendente | |
| HU-02 | Login inválido | Sistema recusa credencial incorreta sem criar sessão | A preencher | Pendente | |
| HU-03 | Visão Geral Jan/26 | War Room mostra resultado 5,00%, meta 4,00% e atingimento 80% | A preencher | Pendente | |
| HU-04 | Dados ausentes | Indicadores e períodos sem dados mostram `—`, sem valores demonstrativos | A preencher | Pendente | |
| HU-05 | Gráfico War Room | Gráfico representa Jan/26 com 5,00% e meta 4,00% | A preencher | Pendente | |
| HU-06 | Filtros | Seleção mensal funciona e não inventa dados nos demais períodos | A preencher | Pendente | |
| HU-07 | Perfil VISUALIZADOR | Consulta painéis, mas não vê Analytics | A preencher | Pendente | |
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
