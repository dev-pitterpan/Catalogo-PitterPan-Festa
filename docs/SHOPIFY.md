# Configuração Shopify

Execute `npm run env:setup` para criar o `.env` ou acrescentar as variáveis ausentes sem substituir valores existentes. Edite o arquivo localmente; nunca envie os tokens em mensagens ou commits.

## Campos para preencher

- `SHOPIFY_STORE_DOMAIN`: domínio técnico real da loja, no formato `nome.myshopify.com`. O identificador do admin e o domínio público não permitem deduzi-lo com segurança.
- `SHOPIFY_ADMIN_ACCESS_TOKEN`: token Admin com permissão `read_products` para a futura leitura de produtos, variantes, coleções e suas imagens.
- `SHOPIFY_API_VERSION`: versão fixada inicialmente em `2026-07`.
- `SHOPIFY_CLIENT_ID` e `SHOPIFY_CLIENT_SECRET`: alternativa para apps que usam client credentials, quando aplicável. Esse fluxo exige app e loja na mesma organização; a implementação deverá obter e renovar o token, que expira em cerca de 24 horas. Não basta preencher as credenciais para ativar isso.
- Tokens Storefront: opcionais para uma futura Cart API. Não são intercambiáveis com o token Admin e não são necessários para o checkout atual por permalink.

Os escopos precisam ser autorizados no app Shopify; a variável `SHOPIFY_READ_SCOPES` é apenas uma referência. Não precisamos de permissões de escrita para importar informações da loja.

## O que funciona agora

HOST, PORT, NEXT_PUBLIC_CATALOG_URL e NEXT_TELEMETRY_DISABLED são usados pela aplicação. As variáveis Shopify estão documentadas e reservadas; a integração que consulta a API, relaciona por SKU e importa informações/imagens ainda precisa ser implementada. O catálogo continua lendo os JSONs locais.

Reinicie o servidor após editar o ambiente. O setup preserva os valores já existentes, inclusive a porta e o domínio. Para produção na Vercel, configure separadamente as variáveis no projeto e publique uma nova versão. Nunca use NEXT_PUBLIC_ em tokens. Não há motivo para versionar o .env.

A importação de imagens para arquivos locais deve ocorrer no computador antes do commit/deploy, ou usar armazenamento persistente próprio. Gravações no filesystem da Vercel durante uma requisição não são uma base persistente de catálogo.

Referências:
- https://shopify.dev/docs/api/usage/access-scopes
- https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant
