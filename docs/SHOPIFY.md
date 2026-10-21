# Shopify e catálogo em escala

A aplicação oferece duas fontes: `json` mantém os catálogos atuais e `postgres` usa versões importadas da Shopify. A integração não está ativada apenas por preencher tokens: prepare o banco, revise uma importação, publique e então troque a fonte. Nunca envie `.env`, tokens ou a URL assinada do export ao Git.

## Preparação

Use Node 24 ou superior e PostgreSQL com conexão TLS/pooler conforme o provedor. O banco precisa ser persistente e acessível tanto pelo computador que importa quanto pela aplicação na Vercel. Dimensione conexões e armazenamento para versões anteriores, registros brutos e imagens em cache; o pool da aplicação usa até três conexões por instância.

```powershell
npm ci
npm run env:setup
```

Preencha no `.env`:

- `DATABASE_URL`: conexão PostgreSQL do provedor.
- `SHOPIFY_STORE_DOMAIN`: domínio técnico real, `nome.myshopify.com`.
- `SHOPIFY_ADMIN_ACCESS_TOKEN`: token Admin válido com `read_products`. Alternativamente, preencha `SHOPIFY_CLIENT_ID` e `SHOPIFY_CLIENT_SECRET` se o app e a loja suportarem client credentials; o importador obtém e renova o token.
- `SHOPIFY_API_VERSION`: versão fixada em `2026-07`; revise a compatibilidade antes de alterá-la.
- Mantenha `CATALOG_DATA_SOURCE=json` durante a preparação.

O escopo precisa ser autorizado no app. `SHOPIFY_READ_SCOPES` é documentação, não concede acesso. Tokens Storefront não são necessários para a importação nem para o checkout por permalink. Não há escrita de produtos na Shopify.

## Importar, revisar e publicar

```powershell
npm run db:migrate
npm run shopify:sync
npm run shopify:report
```

O sync inicia uma exportação GraphQL bulk, acompanha a operação e lê o JSONL em lotes. Execute em um terminal/computador com conexão estável, fora de requisições da Vercel. O processo prepara outra versão sem alterar o catálogo publicado e mostra seu identificador. Uma falha mantém a versão ativa. Para retomar uma importação interrompida ainda válida:

```powershell
npm run shopify:sync -- --resume IDENTIFICADOR
```

Uma operação expirada/falha na Shopify exige nova importação. Uma versão `ready` já validada deve ser publicada, não retomada. O relatório mostra produtos, variantes, imagens ausentes, itens sem coleção mapeada, categorias e os IDs das coleções Shopify.

A associação com Halloween, Natal etc. usa IDs explícitos em `config/shopify-collections.json`; copie a estrutura de `.example.json` e use IDs reais do relatório. Não classificamos produtos pelo nome. Se mudar o mapeamento, faça uma nova importação para aplicá-lo. Sem mapeamento, os itens ficam em **Todos os produtos**, sem serem misturados artificialmente às coleções sazonais.

Após conferir quantidades, SKUs, categorias, preços e imagens do relatório:

```powershell
npm run shopify:publish -- IDENTIFICADOR
```

A publicação troca o ponteiro ativo em transação. Importações vazias, SKUs vazios/duplicados, variantes duplicadas, outra loja e versões não validadas são bloqueadas. Quedas superiores a 20% no total ou em uma coleção ativa exigem revisão; somente quando intencionais, use `--allow-shrink` no publish. Esse argumento não ignora duplicidades nem permite trocar de loja.

Depois da primeira publicação, configure `CATALOG_DATA_SOURCE=postgres` no `.env` e na Vercel, junto com `DATABASE_URL`, e reinicie/republique a aplicação. As credenciais Admin são necessárias no ambiente do importador; os visitantes não as recebem. A aplicação só lê o banco. Para voltar temporariamente aos JSONs de demonstração, use `CATALOG_DATA_SOURCE=json`; isso não restaura um snapshot anterior do banco.

## Categorias e departamentos

`productType` origina a categoria; `vendor` origina a marca. Categorias vazias vão para **Sem categoria**. O relatório permite revisar esses nomes depois que os dados reais chegarem. Edite `config/catalog-departments.json` seguindo o exemplo para agrupar os nomes exatos em departamentos. Não precisa reimportar para mudar esses agrupamentos: publique a configuração da aplicação. Categorias não agrupadas continuam acessíveis em Outras categorias. Categoria duplicada em departamentos é erro de configuração.

A sidebar abre categorias sob demanda, pesquisa todos os nomes e mostra 30 por página. A grade carrega até 48 variantes por resposta e oferece busca por termos/SKU, filtro de categoria/marca e ordenação por preço. O seletor compacto mostra as 200 categorias mais numerosas; todas continuam acessíveis pela busca da sidebar. Marcas no seletor têm limite de 1.000. Cada variante com SKU próprio é um item, evitando enviar cor/tamanho incorretos ao checkout. Assim, 13.518 produtos com múltiplas variantes podem gerar mais de 13.518 itens.

## Preços, fotos e carrinho

Preços e preços anteriores vêm da variante, em BRL, armazenados como decimal no banco. A versão inicial bloqueia lojas com outra moeda; preços por mercado, B2B e tabelas por cliente exigem outra integração. Promoções são mostradas quando o preço anterior é maior. O carrinho consulta a versão ativa ao abrir, calcula subtotal em centavos e informa que é uma estimativa da última sincronização. Descontos, disponibilidade, frete e preço final são confirmados pela Shopify. Não há reserva local nem promessa de estoque em tempo real.

As imagens continuam hospedadas na Shopify: o servidor valida o domínio, limita tamanho/tempo e serve por `/api/product-image`. Os cards usam otimização do Next e carregamento sob demanda. Não baixamos milhares de fotos para o Git nem gravamos dados no filesystem da Vercel. O cache pode levar até um dia para refletir uma foto alterada; a URL inclui a atualização importada. Monitore custo e limites de transferência/otimização do plano de hospedagem. Imagens ausentes usam placeholder; falhas de rede de imagens podem exigir nova tentativa.

O checkout resolve os SKUs selecionados no servidor, mesmo fora da página atual, monta o carrinho Shopify com os IDs das variantes e bloqueia seleção incompleta. O limite atual é 100 SKUs e 999 unidades por SKU. Existe também o orçamento por WhatsApp.

## Operação e limites de validação

A sincronização é manual; não há webhooks, agendamento nem edição administrativa autenticada nesta entrega. Execute novamente sync → report → publish para atualizar preços/fotos/produtos. Guarde backups do PostgreSQL; versões antigas e JSONL bruto são retidos para auditoria e consomem espaço. A limpeza/retention e restauração devem ser definidas antes de manter muitas importações em produção.

`npm test` inclui PostgreSQL embarcado de teste com 13.518 variantes simuladas, preços, paginação, categorias e publicação. Isso não substitui uma importação completa da sua loja, revisão visual e teste de carga no provedor real. Antes da virada, confira SKUs sem cadastro, duplicados, produtos publicados, correspondência de coleções, contagens e uma compra de teste. Não há garantia de ausência total de erros.

Referências oficiais: [Bulk operations](https://shopify.dev/docs/apps/build/apis/graphql-admin/bulk-operations/queries), [escopos](https://shopify.dev/docs/api/usage/access-scopes) e [client credentials](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant).
