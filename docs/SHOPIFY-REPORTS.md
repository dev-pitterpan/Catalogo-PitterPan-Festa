# Relatórios Shopify

A seção Análises abre um resumo com quatro indicadores, evolução das vendas e seis perguntas práticas. Os relatórios completos ficam em uma biblioteca recolhida, organizada por oito categorias. Cada pergunta abre um relatório separado. Busca, período, comparação anterior e exportação CSV compartilham a seleção atual.

Os gráficos permitem alternar entre evolução/barras e colunas com efeito 3D. As colunas mostram dez grupos/dias por página, valores por mouse/toque/teclado e escala do conjunto visível. A tabela e o CSV continuam disponíveis para conferir os números exatos.

O registro `src/lib/admin/shopify-reports.ts` define as consultas permitidas. O endpoint exige sessão administrativa e aceita um identificador fixo de relatório, nunca ShopifyQL arbitrário. As datas são validadas e os resultados não usam cache HTTP.

As consultas usam os datasets oficiais `sales`, `sessions`, `customers`, `fulfillments`, `campaign_sales` e `inventory`:
https://shopify.dev/docs/api/shopifyql/latest/schemas

- Totais e comparação são consultas agregadas separadas. Visitantes únicos, ticket médio e taxas não são somados nem calculados pela média de linhas diárias.
- Percentuais de conversão e recompra usam as contagens agregadas retornadas pela Shopify. Sell-through usa unidades vendidas / (unidades vendidas + estoque final). Denominador zero ou ausente permanece indisponível.
- Vendas por origem usam a última visita; campanhas usam último clique não direto. A interface identifica essa diferença.
- Eventos de processamento, envio e entrega usam suas datas de ocorrência. Não equivalem aos pedidos criados na mesma data.
- Relatórios de estoque consultam histórico de variantes com estoque rastreado. Não substituem o saldo atual do catálogo.
- Agrupamentos trazem até 50 grupos, ordenados pela primeira métrica. A tela mostra dez por vez e permite carregar mais. Totais são consultados sem esse limite. O CSV inclui todas as linhas retornadas e o período.
- Falha na comparação não transforma o período anterior em zero. Falha no relatório atual mostra erro; dados de outra seleção são descartados.

Live View, coortes e RFM têm links para a Shopify. Não há estimativas locais de visitantes ativos ou desses relatórios especializados.

A disponibilidade depende dos dados da loja, dos datasets e das permissões do aplicativo. Os testes locais verificam consultas, datas, agregação e respostas simuladas; não substituem uma consulta autenticada à loja em produção.
