# Datas de oportunidades no MCP

## Causa confirmada

As definições de `get_pipeline_deals_page_v7` e `get_pipeline_deals_totals_v7` fornecidas em 10/09/2026 recebem parâmetros `timestamp with time zone`, mas depois executam:

```sql
v_created_at_start := p_pipeline_deal_created_at_start + interval '3 hours';
v_created_at_end := p_pipeline_deal_created_at_end + interval '3 hours';
-- Comparações usadas pelas duas funções:
d.created_at >= v_created_at_start
d.created_at <= v_created_at_end
```

O instante `2026-09-10T00:00:00-03:00` já equivale a `2026-09-10T03:00:00Z`. O acréscimo interno desloca o limite para `06:00Z`, excluindo registros como `2026-09-10T03:01:51.622572Z` (00:01:51 em São Paulo). O offset enviado pela IA estava correto; a soma adicional na RPC causava o problema.

## Correção no adaptador

O MCP subtrai o acréscimo legado antes de chamar exclusivamente essas duas RPCs. A soma feita pelo banco restaura o limite pretendido. Isso preserva as RPCs utilizadas pelo SaaS e não altera dados, políticas, permissões, JWT, OAuth ou Redis.

Essa compensação não é uma regra universal de fuso: é compatibilidade com as implementações v7 atuais. A conversão de dias usa o identificador IANA `America/Sao_Paulo`, incluindo seu histórico de horário de verão; não presume que todas as datas tenham offset -03 ou dias de 24 horas.

## Consultar um dia inteiro

Para contar oportunidades criadas/recebidas hoje, chame `get_pipeline_deals_totals_v7` com:

```json
{ "created_on": "today" }
```

Para um dia específico, use:

```json
{ "created_on": "2026-09-10" }
```

Também aceita `yesterday`. `today` e `yesterday` são calculados pelo relógio do servidor no fuso configurado, mesmo que o container rode em UTC. A listagem `get_pipeline_deals_page_v7` aceita o mesmo filtro e os mesmos limites; para contagem, use `data.total` da ferramenta de totais, não o número de linhas de uma página. A RPC de totais agrega o conjunto filtrado; para uma etapa, informe `pipeline_stage_id`.

Exemplo para 10/09/2026 em São Paulo:

| Limite | Instante efetivo no banco | Parâmetro enviado à RPC legada |
|---|---|---|
| Início inclusivo | `2026-09-10T03:00:00.000000Z` | `2026-09-10T00:00:00.000000Z` |
| Fim inclusivo | `2026-09-11T02:59:59.999999Z` | `2026-09-10T23:59:59.999999Z` |

Como a RPC usa `<=`, o MCP usa o último microssegundo anterior ao início do próximo dia. Isso inclui registros no fim do dia e exclui exatamente a meia-noite do dia seguinte.

O filtro `created_on` é processado no MCP e não vira parâmetro novo no Supabase. Não o combine com `pipeline_deal_created_at_start/end`; combinações ambíguas são rejeitadas.

## Intervalos explícitos e resposta

Os parâmetros `pipeline_deal_created_at_start/end` continuam aceitando instantes ISO com offset ou `Z`, com precisão de até seis casas decimais. Ambos são inclusivos, conforme as RPCs. O adaptador preserva o instante e os microssegundos, normaliza a representação e compensa o +3h. A IA deve informar o instante desejado, sem compensação manual.

Enviar apenas o início continua significando “desde este instante”, sem limite final. O MCP não transforma silenciosamente esse pedido em um dia: para “hoje” ou “dia X”, use `created_on`.

Quando há filtros de data, a resposta inclui `date_filter`, com os limites efetivos em UTC e `time_zone`. Para `created_on`, inclui também `local_date` e `end_exclusive_utc`. Esse último é informativo: a RPC recebe o fim inclusivo equivalente. A listagem e os totais usam a mesma regra. Para paginar durante uma virada de dia, reutilize o `local_date` retornado em vez de recalcular `today` a cada página.

## Configurações e publicação

```yaml
MCP_TIME_ZONE: America/Sao_Paulo
PIPELINE_RPC_DATE_SHIFT_MINUTES: '180'
```

Estes são os padrões do código e já estão explícitos em `portainer-stack.yml`. Não é necessário mudar o `TZ` do container ou o timezone global do Supabase.

Publique uma nova imagem Docker, atualize a imagem na stack e atualize o catálogo do conector/abra uma nova conversa para o Claude carregar o campo `created_on`. Não foram adicionados escopos nem ferramentas: permanecem 11 ferramentas e as conexões autorizadas mantêm suas permissões. Não é necessário limpar Redis ou refazer OAuth por esta alteração.

Se futuramente remover `+ interval '3 hours'` de **ambas** as RPCs, configure `PIPELINE_RPC_DATE_SHIFT_MINUTES=0` no mesmo momento. Se as funções passarem a usar `<` em vez de `<=` no limite final, o adaptador de fim também precisará ser atualizado; mudar só a variável não altera o contrato inclusivo.

## Alcance e validação

A correção cobre `created_at` das duas RPCs de oportunidades. Não modifica as datas armazenadas nem reinterpreta os timestamps retornados. “Recebidas” aqui significa criadas, não uma eventual data de atribuição ao responsável. Os filtros de responsáveis continuam independentes do filtro de data.

Os filtros de atividades (`today_activity`, `overdue_activity`, `future_activity`) continuam calculados internamente pelas RPCs com `date_trunc('day', now())`, dependendo do fuso da sessão SQL. Não são corrigidos por esta compensação dos parâmetros de criação.

Testes locais reproduzem o acréscimo de 3h e as comparações inclusivas do SQL fornecido. Cobrem o registro relatado, bordas do dia, microssegundos, viradas de mês/ano, ano bissexto, dia local próximo à meia-noite UTC, dias históricos com horário de verão e equivalência entre listagem/totais. A API Supabase é simulada; a validação final deve comparar o resultado no Claude com o SaaS para a mesma conta e os mesmos filtros.

Referência: [PostgreSQL — timestamps, fusos e precisão de microssegundos](https://www.postgresql.org/docs/current/datatype-datetime.html).
