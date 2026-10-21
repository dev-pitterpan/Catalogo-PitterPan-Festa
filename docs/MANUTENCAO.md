# Manutenção

| Mudança                         | Arquivo/pasta                        |
| ------------------------------- | ------------------------------------ |
| Rotas e documento raiz          | `src/app/`                           |
| Tela compartilhada do catálogo  | `src/components/CatalogApp.tsx`      |
| Produtos da coleção             | `public/data/catalogs/<slug>.json`   |
| Lista de coleções               | `public/data/catalogs/manifest.json` |
| Contato e domínio padrão        | `public/data/config/site.json`       |
| Fotos e banners                 | `public/assets/images/catalogs/`     |
| Card e quantidade               | `src/components/ProductCard.tsx`     |
| Painel de orçamento             | `src/components/QuoteCart.tsx`       |
| Busca                           | `src/lib/search.ts`                  |
| Texto do WhatsApp               | `src/lib/quote.ts`                   |
| Persistência da seleção         | `src/hooks/useQuote.ts`              |
| Leitura no servidor             | `src/server/catalogs.ts`             |
| Consultas no navegador          | `src/services/catalog.ts`            |
| Validação                       | `src/schemas/catalog.ts`             |
| Contratos                       | `src/types/catalog.ts`               |
| Cache                           | `src/config/query-client.ts`         |
| Cores Tailwind e imports de CSS | `src/global.css`                     |
| Temas                           | `src/styles/catalog/themes/`         |
| Inicialização e ambiente        | `scripts/run-next.ts` e `.env`       |

## Adicionar uma coleção

Inclua o slug no manifesto e crie seu JSON e assets. Crie e importe o tema em `src/global.css`. As rotas públicas e do gestor usam o slug automaticamente. Use códigos de produto únicos e estáveis.

## Trocar imagens

Substitua o WebP no mesmo caminho ou atualize o JSON. Teste proporção, nitidez e tamanho do arquivo no celular. Recarregue a página para conferir a alteração. Não use CDN se quiser manter a distribuição inteiramente local.

## Alterar contratos

Mantenha esquemas Zod e tipos TypeScript alinhados. Os esquemas validam arquivos e respostas externas; os tipos verificam o código que utiliza esses dados.

## Verificação

Execute `npm run typecheck`, `npm test`, `npm run build` e `npm run test:server`. O teste HTTP confirma os produtos no HTML inicial das rotas públicas e do gestor, além de 404, método não permitido e arquivos locais. Antes de usar uma versão nova, confira visualmente desktop e celular, busca, carrinho e WhatsApp.

## Evolução do painel

Crie endpoints de escrita autenticados, serviços de banco e armazenamento de mídia no servidor. Não grave uploads em `.next`, pois a compilação recria essa pasta. Invalide as consultas do TanStack Query após salvar. Mantenha segredos em variáveis sem prefixo público. A área do gestor atual é de visualização e compartilhamento e não tem autenticação.

## Compra na Shopify

O carrinho oferece “Comprar no site” e mantém o orçamento pelo WhatsApp. O POST `/api/checkout/` recebe somente códigos e quantidades, consulta todos os catálogos atuais e gera um permalink Shopify com as variantes. Seleções antigas também funcionam, pois o vínculo é resolvido no servidor. A seleção permanece salva ao sair para a loja.

Para habilitar um produto, preencha `shopifyVariantId` com o ID numérico da variante (como string) e `siteUrl` com a página pública do produto. SKU, ID do produto e ID da variante são diferentes. O SKU 8936 está vinculado à variante 45465265963062. Itens sem vínculo bloqueiam o envio completo e são identificados na mensagem; nenhum item é omitido silenciosamente. Quantidades permitidas: 1 a 999 por variante, até 100 linhas.

Esta primeira integração usa permalinks, sem token/API autenticada. Preços, estoque, frete e disponibilidade final são confirmados pela Shopify; não existe reserva ou validação de estoque ao clicar no catálogo. O cliente pode precisar informar contato, endereço e frete. Produtos com planos de assinatura exigem outra integração.

Referência: https://shopify.dev/docs/apps/build/checkout/create-cart-permalinks

## Cenas sazonais

`src/components/seasonal/SeasonalEffects.tsx` agenda as cenas e `SeasonalArt.tsx` contém as ilustrações SVG locais. Os movimentos ficam isolados em `src/styles/catalog/seasonal-effects.css`, sem CDN, áudio ou biblioteca de animação. O catálogo público ativa a coleção correspondente; o gestor permanece sem efeitos.

- Halloween: teias descendo nos cantos, aranha suspensa, morcego e até duas aranhas nas fotos visíveis (uma no celular).
- Natal: Papai Noel acenando na lateral, rena e poucos flocos de neve.
- Dia das Crianças: pipa, balão e brilhos delicados.
- Páscoa: coelhinho, ovo e brilhos.
- Festa Junina: lanterninha decorativa, bandeirinhas e pontos de luz.

A primeira cena começa após 5 segundos de navegação ativa. Cada aparição dura 12 segundos e o intervalo seguinte varia entre 45 e 70 segundos. O movimento usa transform/opacity. Os elementos das cenas são desmontados durante as pausas. Não há loop de requestAnimationFrame nem listeners de scroll.

O botão “Efeitos ativados/desativados” salva a preferência no navegador. A opção de reduzir movimento do sistema desativa cenas e controle automaticamente, inclusive se for alterada durante a visita. Abas ocultas, menu e carrinho abertos interrompem e removem a cena; ao voltar, o agendamento recomeça após 5 segundos. Impressão não inclui efeitos.

As decorações ignoram ponteiro e leitores de tela. As aranhas ficam ancoradas somente na foto do card, por portais React; os controles e textos do produto não são usados como área de animação. O celular reduz tamanho e quantidade dos elementos.

Para revisar visualmente: visite cada coleção pública, aguarde 5 segundos, confira desktop/celular e o desaparecimento em 12 segundos; teste o botão, a preferência de movimento reduzido, a troca de coleção e a abertura de carrinho/menu. Não é necessário configurar .env para este recurso.
