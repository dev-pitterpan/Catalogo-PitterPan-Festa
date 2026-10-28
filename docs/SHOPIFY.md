# Shopify e catálogo em escala

A aplicação oferece três fontes: `json` mantém os catálogos locais, `shopify` faz leitura direta e `postgres` usa versões importadas da Shopify. A integração não está ativada apenas por preencher tokens: prepare o banco, revise uma importação, publique e então troque a fonte. Nunca envie `.env`, tokens ou a URL assinada do export ao Git.

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
- Mantenha a fonte atual (`json` ou `shopify`) durante a preparação; não ative `postgres` antes da validação.

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

Os handles e as associações reais de coleções são importados com os produtos, na mesma versão. As uniões de departamentos e Natal são compartilhadas pelos modos Shopify e PostgreSQL. `config/shopify-collections.json` adiciona aliases explícitos por ID quando o handle difere do slug local (como Festa Junina). Não classificamos produtos pelo nome; mudanças nos aliases exigem nova importação.

Após conferir quantidades, SKUs, categorias, preços e imagens do relatório:

```powershell
npm run shopify:publish -- IDENTIFICADOR
```

A publicação troca o ponteiro ativo em transação. Importações vazias, variantes duplicadas, outra loja e versões não validadas são bloqueadas. SKUs vazios/compartilhados são preservados; a identidade é `shopify-<variantId>`. Quedas superiores a 20% no total ou em uma coleção ativa exigem revisão; somente quando intencionais, use `--allow-shrink` no publish. Esse argumento não ignora duplicidades nem permite trocar de loja.

Depois da primeira publicação, configure `CATALOG_DATA_SOURCE=postgres` no `.env` e na Vercel, junto com `DATABASE_URL`, e reinicie/republique a aplicação. As credenciais Admin também são necessárias no servidor da aplicação para confirmar preços/publicação no carrinho e no checkout; os visitantes não as recebem. A vitrine consulta o banco. Para voltar temporariamente aos JSONs de demonstração, use `CATALOG_DATA_SOURCE=json`; isso não restaura um snapshot anterior do banco.

## Categorias e departamentos

`productType` origina a categoria; `vendor` origina a marca. Categorias vazias vão para **Sem categoria**. O relatório permite revisar esses nomes depois que os dados reais chegarem. Edite `config/catalog-departments.json` seguindo o exemplo para agrupar os nomes exatos em departamentos. Não precisa reimportar para mudar esses agrupamentos: publique a configuração da aplicação. Categorias não agrupadas continuam acessíveis em Outras categorias. Categoria duplicada em departamentos é erro de configuração.

A sidebar abre categorias sob demanda, pesquisa todos os nomes e mostra 30 por página. A grade carrega até 20 variantes por resposta e oferece busca por termos/SKU, filtro de categoria/marca e ordenação por preço. O seletor compacto mostra as 200 categorias mais numerosas; todas continuam acessíveis pela busca da sidebar. Marcas no seletor têm limite de 1.000. Cada variante tem identidade própria, mesmo quando compartilha SKU ou não tem SKU, e é um item, evitando enviar cor/tamanho incorretos ao checkout. Assim, 13.518 produtos com múltiplas variantes podem gerar mais de 13.518 itens.

## Preços, fotos e carrinho

Preços e preços anteriores vêm da variante, em BRL, armazenados como decimal no banco. A versão inicial bloqueia lojas com outra moeda; preços por mercado, B2B e tabelas por cliente exigem outra integração. Promoções são mostradas quando o preço anterior é maior. O carrinho consulta as variantes selecionadas diretamente na Shopify ao abrir e calcula o subtotal em centavos. A vitrine continua exibindo os dados da última importação. Descontos, disponibilidade, frete e preço final são confirmados pela Shopify. Não há reserva local nem promessa de estoque em tempo real.

As imagens continuam hospedadas na Shopify: o servidor valida o domínio, limita tamanho/tempo e serve por `/api/product-image`. Os cards usam otimização do Next e carregamento sob demanda. Não baixamos milhares de fotos para o Git nem gravamos dados no filesystem da Vercel. O cache pode levar até um dia para refletir uma foto alterada; a URL inclui a atualização importada. Monitore custo e limites de transferência/otimização do plano de hospedagem. Imagens ausentes usam placeholder; falhas de rede de imagens podem exigir nova tentativa.

O checkout resolve as variantes selecionadas no servidor, mesmo fora da página atual, monta o carrinho Shopify com os IDs das variantes e bloqueia seleção incompleta. O limite atual é 100 produtos/variantes e 999 unidades por variante. Existe também o orçamento por WhatsApp.

## Operação e limites de validação

A sincronização é manual; não há webhooks, agendamento nem edição administrativa autenticada nesta entrega. Execute novamente sync → report → publish para atualizar preços/fotos/produtos. Guarde backups do PostgreSQL; versões antigas e JSONL bruto são retidos para auditoria e consomem espaço. A limpeza/retention e restauração devem ser definidas antes de manter muitas importações em produção.

`npm test` inclui PostgreSQL embarcado de teste com 13.518 variantes simuladas, preços, paginação, categorias e publicação. Isso não substitui uma importação completa da sua loja, revisão visual e teste de carga no provedor real. Antes da virada, confira SKUs sem cadastro, duplicados, produtos publicados, correspondência de coleções, contagens e uma compra de teste. Não há garantia de ausência total de erros.

Referências oficiais: [Bulk operations](https://shopify.dev/docs/apps/build/apis/graphql-admin/bulk-operations/queries), [escopos](https://shopify.dev/docs/api/usage/access-scopes) e [client credentials](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant).

## Cache da leitura direta da Shopify

No modo `shopify`, as páginas GraphQL e a lista de coleções usam o Data Cache do Next, com revalidação de 300 segundos. O cache por consulta/página permite reutilizar resultados entre requisições e instâncias na hospedagem compatível, sem tentar guardar os milhares de produtos em uma única entrada. Apenas respostas validadas pelo cliente Shopify são armazenadas; erros não viram catálogo válido. As chaves identificam loja, versão, consulta e variáveis, sem incluir credenciais.

O cache em memória continua unificando chamadas simultâneas na mesma instância. Preços e dados da vitrine podem levar alguns minutos para refletir alterações; o carrinho e o checkout continuam buscando somente as variantes selecionadas diretamente na Shopify, sem esse cache. O primeiro acesso sem cache ainda depende da latência e dos limites da API. Para uma base grande, a fonte PostgreSQL importada continua sendo o caminho para retirar a varredura da Shopify da abertura das páginas.

A interface exibe imediatamente os dados iniciais enviados pelo servidor. A animação de carregamento aparece apenas enquanto faltam dados, sem acrescentar uma espera fixa após a resposta.

## Atualização da auditoria de 28/10/2026

Antes de usar PostgreSQL com esta versão, execute `npm run db:migrate` no banco exclusivo do catálogo. A migração acrescenta `sku` e a tabela versionada de coleções sem apagar ou reescrever registros existentes. Faça nova importação, relatório e publicação para obter todos os handles atuais. Uma exportação anterior sem handles não pode ser retomada; inicie outra sem `--resume`.

Não altere a origem de Production apenas por ter feito deploy. Compare departamentos, variantes, SKUs compartilhados, fotos, preços e o carrinho no banco de teste. A ativação no banco real não foi feita nesta entrega.

Cada consulta de rede à Shopify tem orçamento de 20 segundos, incluindo até três tentativas dentro desse prazo. A carga completa de uma coleção pode fazer várias consultas e exceder 20 segundos. Uma falha não entrega snapshot parcial; não há promessa de carregar a loja inteira nesse prazo. A confirmação do carrinho/checkout usa consultas apenas às variantes selecionadas. O token do app é reutilizado no processo, sem entrar no cache público. `Server-Timing` na API de catálogos permite separar o tempo de processamento da latência observada pelo cliente; falhas registram duração e origem, sem tokens.

A busca numérica prioriza SKU exato e admite prefixos, sem usar números de descrições. Fotos diretas Shopify pedem largura de 640 px ao CDN; descrições dos cards são limitadas a 180 caracteres. O painel escondido não consulta categorias, e o hub indica navegação pendente. Carrinhos antigos só resolvem SKU quando não ambíguo; variantes compartilhando SKU nunca são mescladas. A seleção em memória sobrevive à troca de catálogo quando localStorage está indisponível, enquanto a aba permanece aberta.

O workflow de CI valida formatação, testes, build, TypeScript e HTTP local a cada push/PR. Efeitos sazonais, autenticação administrativa, rate limit distribuído e sincronização automática continuam sendo etapas separadas; esta atualização não os ativa.
