# Mapa de destinos

O fundo usa OpenStreetMap por Leaflet, instalado no projeto. Os blocos de imagem são buscados diretamente pelo navegador em https://tile.openstreetmap.org/{z}/{x}/{y}.png, com atribuição visível, referrer padrão e cache HTTP. Não há pré-carregamento ou download em lote.

Os pontos são agregados por município/UF: não representam a casa do cliente nem confirmam entrega concluída. As coordenadas públicas são resolvidas localmente no servidor, sem enviar cidades ou endereços a um geocodificador. Sem correspondência exata, o destino continua na tabela e é contado como não localizado no mapa.

Base de municípios: https://github.com/kelvins/municipios-brasileiros, arquivo json/municipios.json, consultado em 29/10/2026. Campos preservados: nome, UF, latitude, longitude. Licença em municipalities-LICENSE.txt.

Por orientação do gestor, OTHER é exibido como Retirada na loja e fica fora dos pontos de entrega, assim como PICKUP. O código original da modalidade permanece armazenado. A regra do classificador Shopify não foi alterada; taxas genéricas continuam com código OTHER. Caso outra transportadora passe a usar taxas genéricas, a configuração de modalidade deverá ser revista.

Filtros de período, modalidade, atendimento, cidade e estado restringem os pontos e a tabela juntos. Pontos próximos são agrupados visualmente conforme o zoom; o número do grupo soma pedidos, e o clique aproxima os destinos. A tabela preserva pedidos e unidades, incluindo destinos que não podem ser localizados.
