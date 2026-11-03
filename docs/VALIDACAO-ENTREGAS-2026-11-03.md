# Validação das modalidades de entrega — 03/11/2026

Consulta somente leitura à Shopify: 69 pedidos não teste, processados desde 05/09/2026, incluindo todas as situações financeiras. Paginação concluída.

| Nome original | Código | Origem | Pedidos | Classificação |
|---|---|---|---:|---|
| Matriz - Pitter Pan Festas | Matriz - Pitter Pan Festas | shopify | 26 | Retirada na loja |
| Envio via Motoboy | OWNE | Frenet | 21 | Motoboy |
| Envio Normal (PAC) | 03298 | Frenet | 6 | PAC |
| Envio Expresso (Sedex) | 03220 | Frenet | 9 | Sedex |
| Sedex | 03220 | Frenet | 1 | Sedex |
| Jadlog Package | F_3 | Frenet | 4 | Jadlog |
| Local Delivery | Local Delivery | shopify | 2 | Entrega local |

Consultas adicionais por `delivery_method:pick-up` confirmaram os 26 pedidos de Matriz; `delivery_method:local` confirmou os dois pedidos de Local Delivery. Entrega local não é retirada. Jadlog não é PAC.

A classificação anterior que convertia qualquer frete desconhecido em retirada foi removida. A leitura do histórico reconhece os títulos acima mesmo quando registros antigos receberam classificação incorreta. Modalidades desconhecidas permanecem em Outras entregas; pedidos com múltiplas modalidades mantêm Múltiplas entregas.

Verificação: 78 testes automatizados aprovados, incluindo matriz de filtros e regressão do histórico sem reimportação. Nenhuma configuração ou pedido da Shopify foi alterado.
