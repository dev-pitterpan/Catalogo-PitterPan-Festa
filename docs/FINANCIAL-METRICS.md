# Conferência de vendas e pagamentos

O resumo financeiro das Análises usa os pedidos sincronizados da Shopify, em uma transação de leitura repetível. O Shopify Analytics permanece separado em **Comparar com o Shopify Analytics** e nos relatórios comerciais. Não é uma conciliação de repasses bancários.

## Valores

- **Recebido confirmado:** soma de `totalReceivedSet` em pedidos não teste da loja, inclusive pagamentos parciais e pedidos posteriormente cancelados/reembolsados.
- **Estornos / reembolsos:** soma de `totalRefundedSet`, incluindo estorno parcial e pedidos cancelados.
- **Líquido após estornos:** recebido menos estornado, calculado em SQL decimal. Divergência em relação ao `netPaymentSet` armazenado aparece como aviso, sem transformar o saldo em lucro.
- **Saldo não pago (calculado):** saldo positivo do total antes de devoluções menos recebido em pedidos pendentes, autorizados ou parcialmente pagos e não cancelados. É um cálculo sobre os campos já sincronizados, não uma reprodução do campo `totalOutstandingSet` da Shopify.
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
