# Catálogo direto da Shopify

Configure no servidor `CATALOG_DATA_SOURCE=shopify`, `SHOPIFY_STORE_DOMAIN` e `SHOPIFY_ADMIN_ACCESS_TOKEN` (ou `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET`). Use a permissão `read_products`. Nunca use variáveis NEXT_PUBLIC para credenciais. O .env local ainda precisa de domínio e credenciais antes da ativação.

O modo Shopify não usa PostgreSQL/Prisma, não executa importações, migrações ou publicações e não altera os dados existentes. `json` e `postgres` continuam disponíveis. Os arquivos locais de apresentação são preservados.

Produtos ativos publicados na loja online aparecem em `/todos/`. Produtos em rascunho, arquivados ou sem URL pública não são expostos. Cada variante aparece uma vez, identificada por `shopify-<variantId>`; o SKU original é um campo separado, inclusive quando vazio ou repetido. A página mostra 20 variantes, com busca, categoria, marca e ordenação existentes.

Coleções presentes nos produtos publicados entram automaticamente no manifesto pelo handle. Catálogos locais recebem produtos da coleção com o mesmo handle; para handles diferentes, configure `config/shopify-collections.json` com o `catalogSlug` local e o `collectionId` Shopify. Tipos de produto alimentam as categorias. Produtos sem coleção continuam disponíveis em `todos`.

Todas as páginas de produtos, variantes e coleções são percorridas por cursor. O servidor compartilha uma leitura entre requisições simultâneas e guarda o resultado completo por cinco minutos, sem publicar leituras parciais. A primeira requisição e as renovações podem demorar em lojas grandes; em hospedagem com timeout curto, o importador PostgreSQL existente é a opção para escala. O cache é por processo, não persistente nem distribuído.

Preços usam a moeda da loja. Estoque agregado é informado quando retornado pela API; disponibilidade é uma estimativa baseada na quantidade e política de estoque, não uma garantia por local/mercado. A Shopify valida a compra no checkout. Fotos são carregadas do CDN Shopify. O checkout continua recebendo os mesmos IDs do catálogo e resolve a variante no servidor.

Validação: `npm run typecheck`, `npm test`, `npm run build`. Os testes simulam múltiplas páginas, variantes e coleções extras, SKUs vazios/repetidos, duplicatas, falhas e checkout. Para validar a loja real, preencha as credenciais, ative o modo, abra `todos`, confira a última página e compare os produtos publicados e as variantes no admin Shopify. Não é necessário rodar nenhum comando `db:*`.

## Validação e compra direta

Execute `node --experimental-strip-types scripts/shopify-validate.ts` para percorrer todas as variantes da loja e gerar `reports/shopify-validation.json`, sem alterar dados na Shopify ou no banco. O relatório conta produtos ativos com URL pública, variantes excluídas, SKUs repetidos, imagens ausentes, categorias, marcas e coleções.

O menu permite pesquisar coleções, carregar mais entradas e filtrar categorias. Ícones e banners genéricos válidos cobrem coleções sem arte sazonal. Festa Junina usa o mapeamento de coleção `322532442166` para preservar `/festa-junina/`, embora o handle Shopify seja `doces-festa-junina`. Dia das Crianças não tem coleção correspondente identificada nesta validação; a rota local foi preservada.

O botão Comprar no site está disponível em produtos com variante Shopify, tanto no gestor quanto na visão do cliente. Ele chama `/api/checkout` e usa a quantidade selecionada (mínimo de uma unidade). O servidor consulta apenas as variantes selecionadas, sem usar o snapshot completo, e rejeita produtos removidos/inativos/sem URL pública. O link de carrinho abre o checkout Shopify; contato, entrega e pagamento são preenchidos lá. Ver no site continua abrindo a página do produto na visão do cliente.

Validação real em 27/10/2026: 13.515 variantes percorridas, 11.007 produtos/variantes públicos, 17 categorias, 178 marcas, 90 coleções; nenhum ID de variante duplicado ou imagem ausente. Foram encontrados 622 valores de SKU repetidos e quatro produtos sem categoria. Nenhuma correção foi feita no cadastro da loja. O checkout foi aberto com um produto de R$ 35,00 e quantidade 1, sem envio de dados pessoais ou conclusão de pedido.


## Departamentos unificados no catálogo

A navegação Shopify usa Todos os produtos, Festas e decoração, Doces e guloseimas, Confeitaria, Embalagens e descartáveis, Artesanato e papelaria, Utilidades, Datas especiais e Ofertas. As definições ficam em `src/lib/catalog/departments.ts`.

Os departamentos consultam a união das coleções configuradas na Shopify; os produtos são deduplicados por ID de variante antes da busca, contagem e paginação de 20 itens. SKUs compartilhados não provocam exclusões. As marcas BWB, Harald, Cromus, Sicao, Ponto das Festas e Regina saem da navegação, mantendo o filtro de vendor na página. Nenhuma coleção é excluída ou renomeada na loja.

O manifesto interno mantém todos os handles originais da Shopify e os aliases locais. A navegação pública é uma projeção reduzida desse manifesto; portanto links antigos permanecem acessíveis. Natal reúne `natal` e `confeitarias-natal`. As duas rotas de Utensílios para Confeitar consultam a mesma união. Departamentos novos têm URLs próprias, sem alterar `siteUrl` dos produtos ou o checkout.

Validação: 18 testes e build aprovados. O departamento Ofertas retornou 187 variantes únicas em dez páginas, com sete na última; o filtro de vendor foi conferido com dados reais.
