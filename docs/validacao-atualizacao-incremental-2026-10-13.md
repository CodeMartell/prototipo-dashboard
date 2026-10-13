# Validação de atualização incremental — homologação local

**Data:** 13/10/2026  
**Ambiente:** `homologacao-local` (API local descartável, porta 15001)  
**Indicador testado:** Resin Consolidation (`incidental_cost`)  

## Objetivo

Comprovar que o recebimento de uma planilha posterior adiciona somente os
períodos novos, preservando os meses já registrados na base.

## Cenário executado

1. Foi enviada uma carga sintética inicial com os períodos de janeiro a
   outubro de 2026.
2. Em seguida, foi enviada uma nova carga sintética contendo somente novembro
   e dezembro de 2026.
3. Foram consultados individualmente todos os 12 períodos após a atualização.

## Dados sintéticos utilizados

| Período | Resultado |
| --- | ---: |
| Jan | 1017 |
| Feb | 1034 |
| Mar | 1051 |
| Apr | 1068 |
| May | 1085 |
| Jun | 1102 |
| Jul | 1119 |
| Aug | 1136 |
| Sep | 1153 |
| Oct | 1170 |
| Nov | 1221 |
| Dec | 1258 |

## Resultado

**Aprovado.** Os valores de janeiro a outubro permaneceram inalterados. Os
meses de novembro e dezembro foram incluídos com os valores enviados, e a
série passou a possuir 12 períodos disponíveis.

Também foram executados os testes automatizados ligados à regra e aos
extratores incrementais: **11 aprovados**.

## Validação ponta a ponta por e-mail/RPA

Também foi executado o fluxo equivalente ao uso produtivo:

1. Uma planilha `.xlsx` normalizada, com o indicador Resina para Nov e Dec,
   foi gerada e enviada à caixa monitorada pelo robô com assunto compatível.
2. O robô localizou um único e-mail, extraiu os dois registros sem erros e
   enviou a carga para a API de homologação.
3. A carga entrou na fila de aprovação e foi aprovada.
4. A API confirmou Jan e Oct preservados, com Nov = 1221 e Dec = 1258
   disponíveis para o DataLens Desktop.

## Achado para acompanhamento

No ambiente de homologação utilizado, a rota de ingestão confirmou o status
`processed` diretamente. O código atual do projeto prevê o status `pending` e
uma etapa de aprovação na fila de ingestões. A preservação dos períodos foi
confirmada no comportamento em execução, mas essa diferença de fluxo deve ser
verificada antes da publicação para assegurar que a versão implantada é a
esperada.
