# Auditoria Shopify e painel — 03/11/2026

## Método de conferência

Consulta somente leitura à loja conectada. Nenhum produto, pedido, reembolso, pagamento, local ou configuração da Shopify foi alterado. Os resultados operacionais detalhados foram apresentados na conversa e não são publicados neste documento.

- Consulta paginada dos pedidos não teste no período disponível, incluindo as conexões de itens e fretes.
- Comparação de seis campos monetários por pedido: total original, total atual, recebido, reembolsado, líquido e saldo oficial. O reprocessamento foi feito em banco isolado, não no banco de produção.
- Conferência adicional dos registros de reembolso e de suas transações, distinguindo sucesso de tentativa de pagamento.
- Verificação de que recebido menos reembolsado corresponde ao líquido informado pela Shopify.
- Reembolso financeiro é independente de devolução física. Não reduzir quantidades proporcionalmente a dinheiro devolvido quando a Shopify não informa itens devolvidos.
- Execução das consultas dos relatórios comerciais para uma janela definida. Essa execução não valida cada combinação possível de filtro nem garante acesso pelo token próprio do app em produção. Relatório sem linhas não é necessariamente erro de consulta.
- Conferência de contagens de produtos por status e amostra de variantes, sem tratar a amostra como auditoria individual de todo o catálogo. O catálogo importa ativos com URL da loja online; seu total não deve ser comparado ao total bruto de produtos. Produtos e variantes são métricas diferentes.
- Consulta dos locais e gateways disponíveis para orientar próximas melhorias, sem inferir estoques separados por loja física ou confundir gateway com repasse bancário.

## Melhorias implementadas

1. Visão geral ganha resumo financeiro de 30 dias e prévia de até três atendimentos e três pedidos com reembolso, com atalhos para a conferência completa. Apenas administrador e gestor têm acesso a esses dados.
2. Vendas e pedidos ganha conferência operacional nos filtros existentes: até dez pedidos pagos com atendimento em aberto, do mais antigo para o mais recente, incluindo prontos para retirada; até dez pedidos mais recentes com reembolso e link para a lista completa. Não foi criado um menu redundante.
3. A lista de reembolsos mostra recebido, reembolsado, líquido, status total/parcial e cancelamento. A data identifica a compra, não o evento de estorno.
4. Saldo não pago passa a usar `totalOutstandingSet`, com indicação explícita de fallback calculado no histórico antigo. Os campos novos são opcionais na leitura, migrados de forma aditiva e preenchidos por uma passagem completa na sincronização, sem apagar pedidos.
5. O total atual `currentTotalPriceSet` aparece quando difere do total original. O total original é preservado.
6. O indicador de ofertas foi renomeado para variantes em oferta, acompanhando sua contagem real.
7. Comando `npm run sales:audit` confere o banco configurado contra a API sem escrever dados. Compara campos em centavos inteiros, versões e situações; informa ausentes, extras, desatualizados e divergentes. Não imprime dados pessoais nem valores completos no relatório.

## Como verificar depois da publicação

Concluir a sincronização em Vendas e pedidos para atualizar o saldo oficial e o total atual dos pedidos anteriores. O processo conserva o checkpoint se for interrompido. Dados legados continuam legíveis antes dessa passagem, com aviso de estimativa onde aplicável.

Para reconciliar o banco real no ambiente que contém as credenciais:

```powershell
npm run sales:audit
# Ou um intervalo específico dentro da cobertura concedida ao app:
npm run sales:audit -- 2026-10-01 2026-10-31
```

Esse comando é somente leitura e não executa correções automáticas. Uma auditoria consistente não comprova repasse bancário, liquidação de cartão, tarifas ou entrega física.

## Próximas melhorias prioritárias

| Prioridade | Melhoria                                               | Critério para implementar                                                                                                                                        |
| ---------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta       | Livro de pagamentos e reembolsos por data de transação | Importar eventos individuais com ID, data, tipo e status, sem somar tentativas falhas. Hoje os valores são acumulados por pedido e o período seleciona a compra. |
| Alta       | Rastreio de envio e entrega                            | Consultar fulfillments/tracking e estado de entrega; não traduzir FULFILLED como entregue ao cliente.                                                            |
| Alta       | Conferência de qualidade do catálogo inteiro           | Paginar todos os ativos/publicados e verificar imagem, SKU, categoria, preço e estoque rastreado; a amostra atual não cobre todos.                               |
| Média      | Pagamentos por Pix, cartão e boleto                    | Separar recebimento confirmado e saldo pendente por gateway, mantendo refund/cancelamento independentes.                                                         |
| Média      | Estoque por unidade física                             | Configurar/confirmar os locais reais na Shopify primeiro; não distribuir quantidades por suposição.                                                              |
| Média      | Margem e lucro                                         | Exige custo, despesas, frete subsidiado e taxas. O saldo líquido de reembolsos não é lucro.                                                                      |

## Verificação da implementação

81 testes automatizados aprovados, incluindo saldo oficial, estimativas legadas, pendências por cliente, reembolsos e auditoria sem escrita. Compilação de produção aprovada e verificações HTTP de autenticação, cookies, CSRF, checkout e renderização de 12 rotas concluídas. O novo endpoint operacional recusa acesso sem sessão.

## Limites

Acesso autenticado ao banco e ao painel de produção não estava disponível neste ambiente. A implementação foi verificada com os pedidos reais em banco isolado e com testes automatizados. A validação visual interativa no navegador não foi executada. Datas e moeda seguem a configuração confirmada da loja: America/Sao_Paulo e BRL. Resultados reais refletem o momento da consulta e podem mudar com novos pedidos ou ajustes.
