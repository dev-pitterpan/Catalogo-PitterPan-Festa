# Vendas Shopify — ativação e manutenção

## O que foi entregue

`/gestor/vendas/` (administrador e gestor) mostra recebimentos líquidos, pedidos pagos, ticket médio de pedidos atualmente pagos, reembolsos, pendentes, cancelados, 30 pedidos recentes e dez variantes mais vendidas. Períodos móveis de 7, 30 e 60 dias por `processedAt`; os valores são o **estado atual dos pedidos daquela coorte**, não o extrato de pagamentos ocorridos nas datas selecionadas nem uma réplica do Shopify Analytics. O líquido usa `netPaymentSet`; inclui frete e impostos. Cancelados podem ter dinheiro recebido ainda não devolvido. Moedas não são somadas entre si. Pedidos de teste são excluídos.

O ranking soma `currentQuantity` (exclui unidades removidas/reembolsadas) em pedidos pagos, parcialmente reembolsados ou reembolsados; cancelados não entram. Variantes são identificadas por ID, nunca por SKU, que pode se repetir ou estar vazio. Não calculamos margem/lucro sem custos confiáveis.

O carrinho é uma ilustração finita dentro da seção de vendidos. Só aparece para eventos **orders/paid autenticados e processados**, com estado atual PAID, sem cancelamento e sem teste. A importação histórica não cria animações. O painel consulta mudanças a cada 30 s quando a aba está visível. Ao abrir a tela, estabelece uma referência e não reproduz vendas anteriores. Eventos novos próximos podem ser agrupados. Não é transmissão instantânea: depende do worker e do agendamento. O controle geral de efeitos e `prefers-reduced-motion` também se aplicam. Nenhum produto é removido do catálogo por causa da animação.

## Isolamento

As credenciais `SHOPIFY_SALES_*` pertencem ao NOVO aplicativo. O cliente não herda token, client ID, segredo ou versão do app antigo. As tabelas `pitterpan_sales_*` são exclusivas do módulo. `sales:migrate` só cria essas tabelas/índices; não executa a migração geral nem altera tabelas de produtos, contas ou de outro projeto. Nada deve ser executado no banco `catalogo-pro` do outro desenvolvedor. Este módulo não escreve produtos, estoque, preços, pedidos ou reembolsos na Shopify.

## 1. Atualizar e configurar localmente

Pare o servidor com Ctrl+C. Na pasta do projeto:

```powershell
git pull --ff-only
npm run sales:setup
```

O setup lê o arquivo privado `.env.shopify-test.local` já validado, trata BOM e acrescenta no `.env` apenas:

- `SHOPIFY_SALES_STORE_DOMAIN`
- `SHOPIFY_SALES_CLIENT_ID`
- `SHOPIFY_SALES_CLIENT_SECRET`
- `SHOPIFY_SALES_API_VERSION`
- `CRON_SECRET` aleatório, caso ainda não exista.

Preserva `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `CATALOG_DATA_SOURCE`, autenticação e `DATABASE_URL`. Não imprime os valores. Se uma variável de vendas preenchida divergir, interrompe sem salvar; revisar manualmente. Não commitar `.env`, arquivo de teste ou segredos. Nenhuma dependência nova: `npm ci` não é necessário para esta alteração.

## 2. Banco e importação inicial

Confirme que `DATABASE_URL` é o banco exclusivo do seu catálogo, com pooler/TLS. Faça backup antes de operações no banco de produção. Execute:

```powershell
npm run sales:migrate
npm run sales:sync
npm run dev
```

Abra `/gestor/vendas/` como administrador ou gestor. A primeira execução lê pedidos acessíveis criados na janela de 60 dias; o app atual não possui `read_all_orders`. Se a Shopify bloquear outros campos protegidos, regularize as permissões do novo app antes de continuar. Não usamos dados pessoais dos clientes nas consultas nem armazenamos o JSON bruto.

Cada etapa consulta cinco pedidos, completa TODAS as páginas de itens antes de gravar um pedido e usa transação. O script repete as etapas até concluir. A tela oferece atualização por etapa para não prender o navegador numa importação longa. O cursor e limite superior da janela ficam no PostgreSQL. Uma falha preserva o checkpoint; execute novamente. Indicadores parciais são sinalizados enquanto a importação está em andamento. Nas execuções seguintes, busca alterações desde o último checkpoint com sobreposição de cinco minutos e limite superior fixo.

Há exclusão mútua por loja, lease de dez minutos e limite de trabalho de aproximadamente três minutos por etapa, além dos timeouts por consulta. Uma execução encerrada à força pode exigir esperar a lease expirar. A API usa `maxDuration=300`; confirme o limite do plano da hospedagem antes de usar grandes lotes pela web. Para importação inicial longa, prefira o script local.

## 3. Produção na Vercel

No projeto **Catalogo-PitterPan-Festa**, acrescente em Environment Variables de Production os mesmos valores `SHOPIFY_SALES_*`, `CRON_SECRET` e confira `DATABASE_URL`. Não substitua as variáveis `SHOPIFY_*` do catálogo. Faça redeploy para o servidor carregar os valores. Não é necessário mudar `CATALOG_DATA_SOURCE` para usar vendas.

A publicação do código sozinha deixa a seção em estado de configuração pendente; não cria tabelas, não importa pedidos e não ativa cobrança/agendamento.

## 4. Inscrever eventos do novo aplicativo

Somente depois de a rota estar publicada, banco migrado e variáveis na Vercel:

```powershell
npm run sales:webhooks
```

O comando usa o novo app para criar inscrições ORDERS_CREATE, ORDERS_PAID, ORDERS_UPDATED, ORDERS_CANCELLED e REFUNDS_CREATE em:

`https://catalogopitterpanfesta.vercel.app/api/webhooks/shopify/sales/`

Lista as inscrições paginadas e não recria pares de tópico+URL já existentes; não exclui nem edita inscrições de nenhum app. O endpoint recebe somente IDs e timestamps nas inscrições criadas pelo script. `updated_at` deve permanecer incluído nos tópicos de pedidos para não suprimir atualizações com payload reduzido. A versão do payload é herdada da configuração de webhooks do app (2026-10), não apenas da versão GraphQL.

O script altera as inscrições de eventos, não pedidos/produtos. Pode exigir a aprovação aplicável a dados de pedidos no app. Se configurar os webhooks manualmente pelo admin da loja, a assinatura pode usar outro segredo; nesse caso configure `SHOPIFY_SALES_WEBHOOK_SECRET` com o segredo daquela origem. As inscrições do script usam o segredo do app por padrão.

## 5. Ativar processamento automático

O endpoint de webhook valida loja, tópico, HMAC-SHA256 sobre os bytes originais, tamanho máximo e ID; grava **somente metadados mínimos** numa fila durável e retorna HTTP 200 após persistir. Não consulta GraphQL durante o recebimento. Falhas de persistência retornam 503 para permitir reenvio. Reenvios são deduplicados por loja+delivery ID.

O worker precisa ser chamado separadamente por um agendador (Vercel Cron compatível com o plano ou outro serviço de confiança):

- Método GET: `/api/cron/sales/`
- Header: `Authorization: Bearer <valor privado de CRON_SECRET>`
- Sugestão inicial: uma vez por minuto, se o plano permitir. Uma execução processa até três eventos e uma página de reconciliação. Monitore a fila e ajuste a frequência para o volume real. Se `more=true`, há trabalho adicional; não dispare chamadas concorrentes. Uma chamada que encontra outra ativa retorna `busy=true`.

**Nenhum agendamento é criado automaticamente.** Não coloque o segredo na URL, no Git ou em prints. Para execução manual local, `npm run sales:sync` também drena etapas. O painel atualiza a leitura dos indicadores automaticamente, mas isso sozinho não executa o worker.

Um evento com falha recebe retentativa com espera crescente (até uma hora), sem bloquear a importação dos demais pedidos. Após dez tentativas fica pendente de revisão e o painel avisa. Corrija a causa e use `npm run sales:retry` seguido de `npm run sales:sync`. O worker relê o pedido canônico, recusa retrocessos de `updatedAt`, grava pedido+itens atomicamente e só conclui o evento após commit. Confirmação visual é única por loja+pedido. Cancelamentos/reembolsos posteriores atualizam o registro, não subtraem novamente um valor já consolidado.

## Limites e operação

- O acesso atual cobre os pedidos acessíveis na janela de 60 dias. Reembolsos de pedidos mais antigos podem exigir `read_all_orders` para a releitura canônica; ficam na fila para revisão se a consulta não for permitida.
- Uma reconciliação recupera estados financeiros mesmo se um webhook faltar; não inventa uma animação de pagamento para uma venda histórica.
- Exclusões definitivas de pedidos não têm um fluxo de remoção nesta entrega. Revisão/expurgo de dados apagados na origem e retenção das tabelas devem ser definidos antes de ampliar o histórico.
- Venda de loja física só entra se o pedido estiver registrado na Shopify. Orçamento do catálogo não é pedido pago. Não há acesso a número completo de cartão ou dados bancários sensíveis.
- Não há recuperação de histórico além dos escopos concedidos nem garantia de paridade com relatórios contábeis da Shopify.
- A página e API de vendas são restritas a admin/gestor; atendimento não recebe valores financeiros. POST de atualização exige mesma origem. Cron exige segredo próprio. Webhooks não usam sessão de usuário.
- Rotas existentes do catálogo, carrinho/orçamento/checkout e login permanecem independentes. Se as vendas não estiverem configuradas, apenas a nova seção fica indisponível.

Referências: [Order](https://shopify.dev/docs/api/admin-graphql/latest/objects/Order), [LineItem](https://shopify.dev/docs/api/admin-graphql/latest/objects/LineItem), [verificação de webhooks](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries), [WebhookSubscriptionInput](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/WebhookSubscriptionInput).

## Fotos, modalidade de entrega e paginação

O painel filtra período, situação financeira, categoria e modalidade; consulta todos os pedidos importados antes de paginar dez por vez. O ranking continua sendo o top 10 de variantes, com foto e divisão das unidades por modalidade do pedido. Os indicadores usam a seleção completa, não apenas a página. Ao carregar mais, a atualização automática fica pausada para preservar a lista; **Atualizar lista** reinicia a consulta.

A foto vem de `LineItem.image.url`, com fallback para a variante na importação publicada. As linhas de frete são lidas integralmente e classificadas pelos nomes/códigos explícitos: retirada, motoboy, Sedex, outra entrega, modalidades múltiplas e não identificado. Linhas removidas não participam. Frete grátis não implica retirada, entrega local não implica motoboy, Correios/PAC não implica Sedex. A modalidade representa a escolha do pedido; não comprova postagem ou entrega. Pedidos com modalidades distintas não atribuem arbitrariamente cada item a uma delas: permanecem como múltiplos. Não são importados endereços, telefones ou códigos de rastreio.

Após atualizar o código local, execute uma vez:

```powershell
npm run sales:migrate
npm run sales:sync -- --refresh-details
```

A migração é aditiva e pode ser repetida. A opção `--refresh-details` reinicia somente o checkpoint de leitura do módulo para reler os últimos 60 dias e completar fotos/modalidades dos pedidos antigos, sem apagar pedidos, duplicar vendas ou modificar a Shopify. Não reinicie essa opção para retomar uma leitura interrompida: use apenas `npm run sales:sync`. Uma atualização concorrente bloqueia o reinício. Sem essa releitura, pedidos antigos continuam explicitamente não identificados. Os GETs toleram as colunas novas ausentes, mas a gravação dos novos metadados exige a migração.
