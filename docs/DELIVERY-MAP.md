# Mapa de destinos

O fundo usa OpenStreetMap por Leaflet, instalado no projeto. Os blocos de imagem são buscados diretamente pelo navegador em https://tile.openstreetmap.org/{z}/{x}/{y}.png, com atribuição visível, referrer padrão e cache HTTP. Não há pré-carregamento ou download em lote.

Os pontos são agregados por município/UF: não representam a casa do cliente nem confirmam entrega concluída. As coordenadas públicas são resolvidas localmente no servidor, sem enviar cidades ou endereços a um geocodificador. Sem correspondência exata, o destino continua na tabela e é contado como não localizado no mapa.

Base de municípios: https://github.com/kelvins/municipios-brasileiros, arquivo json/municipios.json, consultado em 29/10/2026. Campos preservados: nome, UF, latitude, longitude. Licença em municipalities-LICENSE.txt.

Por orientação do gestor, OTHER é exibido como Retirada na loja e fica fora dos pontos de entrega, assim como PICKUP. O código original da modalidade permanece armazenado. A regra do classificador Shopify não foi alterada; taxas genéricas continuam com código OTHER. Caso outra transportadora passe a usar taxas genéricas, a configuração de modalidade deverá ser revista.

Filtros de período, modalidade, atendimento, cidade e estado restringem os pontos e a tabela juntos. Pontos próximos são agrupados visualmente conforme o zoom; o número do grupo soma pedidos, e o clique aproxima os destinos. A tabela preserva pedidos e unidades, incluindo destinos que não podem ser localizados.

## Calendário e consulta ao passar o mouse

Pontos compactos mostram cidade/UF, pedidos e unidades ao passar o mouse; em grupos, listam até cinco cidades e permitem aproximar pelo clique. Conteúdo textual é criado com textContent.

Mapa, Vendas e Análises aceitam start/end em YYYY-MM-DD, com validação de datas reais, início/fim completos, ordem e intervalo máximo inclusivo de 366 dias. No banco, o período é fechado no início e aberto no dia posterior à data final, no fuso America/Sao_Paulo. A paginação de Vendas mantém o intervalo. ShopifyQL usa o intervalo inclusivo no fuso da loja e compara com o período anterior de mesma duração. Consultas antigas no banco dependem do histórico importado.

Análises inclui uma seção de operação dos pedidos. Itens pedidos vêm de quantity_ordered (FROM sales). Processados, entregues e tempo vêm de orders_fulfilled, orders_delivered e median_hours_order_to_fulfillment (FROM fulfillments). O tempo é mediana em horas. Datas de venda, processamento e entrega correspondem a eventos distintos. Falhas de operações não impedem as análises de vendas; valores ausentes permanecem indisponíveis, sem estimativas.

Fontes oficiais: https://shopify.dev/docs/api/shopifyql/latest/schemas/sales_revenue/sales e https://shopify.dev/docs/api/shopifyql/latest/schemas/orders/fulfillments
