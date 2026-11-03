# Conferência de vendas e pagamentos

O resumo financeiro das Análises usa os pedidos sincronizados da Shopify, em uma transação de leitura repetível. O Shopify Analytics permanece separado em **Comparar com o Shopify Analytics** e nos relatórios comerciais. Não é uma conciliação de repasses bancários.

## Valores

- **Recebido confirmado:** soma de `totalReceivedSet` em pedidos não teste da loja, inclusive pagamentos parciais e pedidos posteriormente cancelados/reembolsados.
- **Estornos / reembolsos:** soma de `totalRefundedSet`, incluindo estorno parcial e pedidos cancelados.
- **Líquido após estornos:** recebido menos estornado, calculado em SQL decimal. Divergência em relação ao `netPaymentSet` armazenado aparece como aviso, sem transformar o saldo em lucro.
- **Saldo não pago:** soma da parte positiva do campo oficial `totalOutstandingSet` em pedidos pendentes, autorizados ou parcialmente pagos e não cancelados. Valores negativos (saldo a devolver) são preservados no histórico e não tratados como recebíveis. Registros antigos sem o campo usam temporariamente total antes de devoluções menos recebido, com aviso e contagem de estimativas. A próxima sincronização faz uma passagem completa de 60 dias para preencher os campos oficiais, retomando a paginação normalmente. Zero oficial é diferente de campo ainda não importado.
- **Expirados e anulados:** quantidade e valor nominal dos pedidos no estado financeiro EXPIRED/VOIDED. Não são recebimentos. Não se infere expiração por tempo nem se converte automaticamente um pagamento anulado em reembolso.
- **Cancelados:** dimensão independente do pagamento. Um cancelado pode estar pago, parcialmente reembolsado ou totalmente reembolsado; seus recebimentos e reembolsos permanecem nos totais monetários. O quadro de cancelados não é somado aos setores do gráfico financeiro.

A distribuição por pagamento é uma partição sem duplicação por `financial_status`. Filtros de pagamento não escondem pedidos cancelados. O filtro Cancelado continua disponível separadamente. A tabela mostra ambos os estados e as quatro colunas monetárias.

## Datas, moeda e limites

O período seleciona a **data de processamento do pedido**, em America/Sao_Paulo, com início inclusivo e fim exclusivo no próximo dia. A série diária agrupa por essa mesma data. Recebimentos e reembolsos são os valores acumulados atuais desses pedidos: um estorno ocorrido depois do período pode estar incluído. Este não é um relatório de movimentações por data de transação.

Moedas ficam separadas, sem conversão nem soma entre moedas. Pedido de teste e outra loja são excluídos. Sem registros sincronizados, a interface mostra ausência de dados, sem concluir que a loja não vendeu. Os dias sem registros dentro de uma seleção existente aparecem como zero, com aviso sobre a cobertura da sincronização. O horário da última conferência e a importação em andamento são exibidos.

O ranking de produtos usa unidades atuais de pedidos não cancelados, com recebimento maior que zero e situação PAID/PARTIALLY_REFUNDED. Não apresenta expirados ou reembolsos totais como produtos vendidos. O atalho das Análises leva a esse ranking. Os relatórios nativos de produtos continuam disponíveis, identificados como comerciais.

A Shopify documenta que seus relatórios de vendas incluem pedidos pendentes, não pagos e cancelados, enquanto valores de recebimento/reembolso pertencem à visão financeira do pedido:

- https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/sales-report
- https://shopify.dev/docs/api/admin-graphql/latest/objects/Order
- https://help.shopify.com/en/manual/fulfillment/managing-orders/order-status

Testes com PGlite cobrem pedidos pagos, pendentes, parcialmente pagos, expirados, anulados, estornos parciais, reembolso de cancelados, moedas/loja de origem, exclusão de testes, soma das séries e alerta de divergência. A validação numérica da loja em produção exige pedidos sincronizados e acesso autenticado; testes simulados não comprovam o valor real vendido pela loja.

O seletor de situação também está disponível no quadro Pedidos recentes. Ambos os seletores controlam o mesmo filtro, aplicado no servidor aos pedidos e indicadores, em conjunto com período, categoria e modalidade. A troca retorna ao primeiro lote de dez. Reembolsados · total ou parcial (`REFUNDS`) seleciona valor acumulado reembolsado maior que zero, incluindo pedidos cancelados. As opções de reembolso parcial/total continuam disponíveis por status financeiro exato. Cancelamento é uma condição independente do pagamento: um pedido pode aparecer tanto em Cancelados quanto em Reembolsados. Esses grupos não devem ser somados como conjuntos exclusivos.

Em Pedidos recentes, o controle de situação é agora uma busca textual automática (250 ms após digitar), sincronizada ao seletor do topo. Reconhece prefixos em português, singular/plural e estorno como reembolso. Texto desconhecido retorna lista vazia, nunca todos os pedidos; limpar restaura todas as situações preservando período, categoria e entrega. A lista volta ao primeiro lote, e os resultados anteriores ficam visíveis com indicação de atualização até a resposta. O campo permanece montado para preservar foco e digitação.

## Conferência operacional e auditoria somente leitura

A Visão geral mostra um resumo de 30 dias apenas para administrador/gestor. Vendas e pedidos apresenta a fila de até dez atendimentos mais antigos e até dez pedidos mais recentes com reembolso, respeitando os filtros globais. O link de reembolsos leva à lista completa paginada. A data na conferência de reembolsos é a da compra; valores são acumulados, não eventos por data de estorno. Pronto para retirada continua em aberto; FULFILLED significa atendimento concluído, não entrega comprovada. Reembolsos parciais com saldo líquido positivo podem continuar exigindo atendimento.

`npm run sales:audit -- 2026-10-01 2026-10-31` compara a Shopify ao banco configurado, sem alterar dados. Consulta pedidos e seis campos monetários em centavos inteiros, status e versão; distingue ausentes, extras, desatualizados, divergentes e campos oficiais ainda não preenchidos. Não registra dados pessoais nem valores financeiros completos no relatório. Sem argumentos, usa os últimos 60 dias. A cobertura da API depende das permissões do app. Datas do processamento são interpretadas no fuso de Brasília.

## Filtro de atendimento

O campo `fulfillment` é independente do pagamento. A seleção `AWAITING` corresponde exatamente ao contador de atendimentos em aberto: pedidos não cancelados, pagos ou parcialmente reembolsados, com saldo líquido positivo e situação de atendimento diferente de FULFILLED/FULFILLMENT_NOT_REQUIRED. Inclui pronto para retirada. As demais opções filtram a situação específica de atendimento sem impor pagamento. Pedidos, totais, produtos vendidos e paginação aplicam o mesmo filtro. Um pagamento PENDING não equivale a atendimento pendente.

## Conferência de itens do atendimento

Conferir itens abre uma janela de consulta somente leitura à Shopify, sob a mesma autorização de vendas. A consulta é carregada sob demanda, pagina produtos e itens de cada atendimento e confere as versões antes de retornar o resultado. Nomes e quantidades não são inferidos de percentuais de pagamento.

Aguardando preparo corresponde a UNFULFILLED; Em preparo a IN_PROGRESS; Parcialmente atendido a PARTIALLY_FULFILLED; Atendido a FULFILLED. Esses nomes não afirmam entrega física. A quantidade Atendido soma somente registros SUCCESS por ID do item, excluindo cancelados e falhas. A atender usa unfulfilledQuantity oficial. Quantidade atual, original e unidades fora do saldo são preservadas separadamente; itens removidos ou reembolsados não são transformados em pendência por subtração. O histórico de atendimentos pode incluir unidades depois reembolsadas ou reenviadas.

A janela indica a data da conferência e avisa se o estado atual difere do resumo importado. Nenhum botão marca produtos como enviados ou altera a Shopify. Não é necessário migrar o banco para esses detalhes.

## Modalidade e frete cobrado

Entrega local continua sendo uma modalidade distinta de retirada na loja. A lista mostra o frete por pedido, sem presumir que toda entrega local seja gratuita. O valor é a soma de discountedPriceSet.shopMoney das linhas de frete ativas, incluindo descontos de frete e excluindo linhas removidas. Usa o preço após descontos e antes de reembolsos, para não chamar de grátis um frete originalmente cobrado e depois devolvido. Os valores são somados em centavos inteiros.

Zero confirmado aparece como Frete grátis; retirada com zero aparece como Sem cobrança de frete. Dados antigos ainda não consultados aparecem como Frete a conferir; ausência de linhas ativas, como Frete não informado. O valor já integra o total do pedido e não é somado novamente a recebimentos ou vendas. Não representa o custo de entrega pago pela loja.

A próxima sincronização adiciona os campos de forma compatível e faz a passagem de preenchimento no histórico recente. Um marcador de conferência distingue ausência legítima de metadados antigos, evitando repetir a importação por um pedido sem linha de frete. Nenhuma tarifa ou modalidade é alterada na Shopify.
