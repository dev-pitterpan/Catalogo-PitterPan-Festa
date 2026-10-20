# Manutenção

| Mudança | Arquivo/pasta |
| --- | --- |
| Rotas e documento raiz | `src/app/` |
| Tela compartilhada do catálogo | `src/components/CatalogApp.tsx` |
| Produtos da coleção | `public/data/catalogs/<slug>.json` |
| Lista de coleções | `public/data/catalogs/manifest.json` |
| Contato e domínio padrão | `public/data/config/site.json` |
| Fotos e banners | `public/assets/images/catalogs/` |
| Card e quantidade | `src/components/ProductCard.tsx` |
| Painel de orçamento | `src/components/QuoteCart.tsx` |
| Busca | `src/lib/search.ts` |
| Texto do WhatsApp | `src/lib/quote.ts` |
| Persistência da seleção | `src/hooks/useQuote.ts` |
| Leitura no servidor | `src/server/catalogs.ts` |
| Consultas no navegador | `src/services/catalog.ts` |
| Validação | `src/schemas/catalog.ts` |
| Contratos | `src/types/catalog.ts` |
| Cache | `src/config/query-client.ts` |
| Cores Tailwind e imports de CSS | `src/global.css` |
| Temas | `src/styles/catalog/themes/` |
| Inicialização e ambiente | `scripts/run-next.ts` e `.env` |

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
