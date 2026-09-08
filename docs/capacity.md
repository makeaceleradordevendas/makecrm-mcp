# Capacidade: meta de 100 chamadas por segundo

Esta é uma meta de homologação, não uma capacidade de produção já demonstrada. Os testes automatizados usam dados fictícios. Não houve teste de carga da Vercel ou do Supabase real.

## Carga inicial

O script `load/mcp.k6.js` agenda 100 consultas por segundo durante 5 minutos, alternando as três ferramentas. Precisa de um ambiente de teste com a API e autenticação implementadas, k6 e um arquivo privado de tokens de teste. A chegada constante evita que a taxa diminua silenciosamente quando as respostas ficam lentas. [Executor k6](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/).

```sh
k6 run -e MCP_URL=https://mcp-homolog.seudominio.com/mcp -e TOKENS_FILE=/caminho/privado/tokens.json load/mcp.k6.js
```

O arquivo contém um array JSON de tokens válidos de contas de teste. Não o adicione ao Git. Use pelo menos 100 usuários distribuídos por pelo menos quatro empresas, com acesso às três coleções; valide separadamente concentração de carga numa única empresa. Os tokens precisam permanecer válidos pelo tempo total do teste. Não imprimir headers/corpos nem habilitar debug HTTP com credenciais reais.

Critérios iniciais propostos: p95 abaixo de 1 segundo, p99 abaixo de 2 segundos, menos de 1% de erros e nenhuma iteração descartada pelo gerador. Esses objetivos deverão ser ajustados a partir do tamanho dos resultados e das consultas reais.

## Custos por consulta

No modo Supabase integrado, uma consulta válida usa três operações Redis para cotas, uma leitura da sessão por hash de token e outra por ID de credencial antes da consulta: aproximadamente **500 comandos Redis/s para 100 consultas/s**. Há duas chamadas REST ao Supabase: identidade e leitura, aproximadamente **200 chamadas/s**. A função SQL de leitura também revalida a identidade na mesma transação. O modo com API separada adiciona o limite por IP das rotas internas e chamadas HTTP entre deployments.

Essa contagem não inclui consultas internas do backend, refresh OAuth ou autenticação de usuários no Supabase. O timeout de 8 segundos é por chamada à API, não um objetivo de latência.

100 chamadas/s sustentadas durante 24 horas equivalem a 8,64 milhões de chamadas/dia. Dimensionar cobrança e limites de Vercel/Redis/Supabase segundo pico, duração do pico e uso sustentado, sem confundir o número de usuários conectados com o de chamadas por segundo.

## Isolamento de carga

- Padrão por usuário: 120 requisições/minuto, somando suas credenciais.
- Padrão por empresa: 3.000 requisições/minuto, somando seus usuários.
- Padrão por IP: 30.000 requisições/minuto; clientes de IA podem compartilhar IP.
- Máximo local: 200 requisições MCP em andamento por instância; isso não é um limite global.
- Redis usa incremento e expiração atômicos em janelas de 60 segundos. Podem ocorrer rajadas na fronteira das janelas; não equivale a limitar suavemente a taxa por segundo.
- Falhas do Redis ou da validação retornam 503; excesso de cota retorna 429 com `Retry-After`.

Limites de exemplo precisam ser calibrados: uma empresa sozinha não poderá consumir 100 chamadas/s com a cota padrão de 3.000/minuto. Quotas são decisões de produto, separadas da meta agregada de capacidade.

## Homologação antes de produção

Medir 100/s por 5 minutos, ampliar para uma hora, testar rajadas e concentração por empresa. Observar p95/p99, erros de ferramentas dentro de HTTP 200, rejeições por cota, duração das funções, memória, latência Redis, latência da API, consultas lentas e custo.

Testar também cold starts, múltiplas instâncias, indisponibilidade das dependências, credenciais revogadas e consultas com páginas grandes. Confirmar que a capacidade do banco permanece estável. Não repetir chamadas automaticamente no MCP para mascarar falhas ou multiplicar carga.

Os testes funcionais validam protocolo, contexto, API, criptografia e revogação. Testes SQL adicionais demonstram a preservação de RLS com dados fictícios. Eles não demonstram desempenho real, conformidade completa OAuth ou a configuração de RLS/índices do Supabase de produção. O UUID atual expira com o access token associado (até uma hora); use credenciais com validade suficiente para cada ensaio até concluir a renovação OAuth.
