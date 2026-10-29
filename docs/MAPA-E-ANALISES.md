# Mapa de entregas e Análises Shopify

O menu troca Produtos por Mapa de entregas e Calendário comercial por Análises Shopify. Produtos continuam disponíveis pela busca, estoque e relatórios, mantendo os links antigos. `/gestor/calendario/` redireciona para Análises; campanhas cadastradas não são apagadas. Mapa e Analytics são exclusivos de admin e gestor, inclusive nas APIs.

## Atualização dos dados

Produtos e estoque continuam representando a importação publicada: `shopify:sync` → `shopify:report` → `shopify:publish`. Esta mudança não ativa atualização automática do catálogo. Pedidos e destinos usam a importação de vendas; os webhooks precisam de um worker agendado. Não há Cron de produção criado por esta entrega. As análises oficiais consultam ShopifyQL na abertura, na troca de período ou em Atualizar, sujeitas ao processamento de relatórios da Shopify.

## Destinos

Execute a migração aditiva de vendas e releia os detalhes uma vez após atualizar o código:

```powershell
npm run sales:migrate
npm run sales:sync -- --refresh-details
```

Só são solicitados e persistidos cidade, código do estado, país e data da leitura. A consulta de endereço é separada: falta de permissão não interrompe a importação dos pedidos e não produz endereços estimados. Falhas preservam o último destino lido; pedidos sem dados permanecem explicitamente incompletos. Não há envio de destinos a geocodificadores.

O mapa do Brasil agrega pedidos por UF. A tabela detalha cidade/UF/país e soma unidades atuais dos itens, sem multiplicar pedidos com vários itens. Retiradas ficam separadas; pedidos internacionais e destinos incompletos não são posicionados arbitrariamente no mapa. Cancelados e testes não entram. Fulfilled representa atendimento concluído, não confirmação de entrega física. Os filtros de período, modalidade e atendimento alimentam o mapa; estado e busca refinam a tabela.

## Análises

Usa `shopifyqlQuery`, que exige `read_reports`, versão compatível e o acesso a dados protegidos aplicável. Nenhuma permissão é concedida automaticamente. Dados de Analytics não são reconstruídos a partir do estoque ou tratados como recebimentos bancários. Vendas brutas, descontos, estornos, vendas líquidas, frete, tributos, total, pedidos, valor médio, série diária, canais e produtos vêm dos relatórios oficiais. Comportamento consulta o dataset sessions; conversão usa sessões com checkout concluído / sessões, sem misturar contagens de pedidos.

Cada conjunto opcional falha de forma independente. Ausência de acesso ou erro de parsing aparece como indisponibilidade, nunca como zero. Os períodos usam dias completos conforme o fuso configurado na loja, incluindo hoje, com comparação anterior de mesma duração. Exportação CSV mantém os valores retornados pela Shopify e neutraliza fórmulas. Nenhum dado real de produção foi usado nos testes.

Referências oficiais:

- https://shopify.dev/docs/api/admin-graphql/latest/queries/shopifyqlQuery
- https://shopify.dev/docs/api/admin-graphql/latest/objects/MailingAddress
- https://shopify.dev/docs/api/shopifyql/latest/schemas/sales_revenue/sales
- https://shopify.dev/docs/api/shopifyql/latest/schemas/sessions_and_behavior/sessions
