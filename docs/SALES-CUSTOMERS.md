# Clientes nos pedidos

Os pedidos exibem nome e ID do cadastro Shopify quando a API os disponibiliza. Nunca agrupamos por nome, valor ou endereço; contas diferentes com o mesmo nome continuam separadas. Um ID igual identifica o mesmo cadastro, sem afirmar identidade pessoal fora dele. Avatar neutro, sem inferir gênero pelo nome.

`src/server/sales/customers.ts` contém validação, consulta complementar e resumo. A sincronização de vendas lê identificação separadamente: falha na consulta de cliente não impede gravar os valores financeiros. A coluna JSONB é aditiva e preparada pela sincronização/endpoint; leituras anteriores à migração usam `to_jsonb` e mostram ausência explicitamente.

Na tela, os pedidos visíveis são consultados automaticamente em lotes de até dez. O botão permite nova tentativa. A rota POST `/api/admin/sales/customers/` exige perfil admin/gestor (gerente de compras herda admin), mesma origem e pedidos já pertencentes à loja configurada. Atualizações só são aceitas se a versão do pedido consultado corresponde à versão gravada. Retorna somente os pedidos solicitados, sem mexer em preços, pagamentos ou situação. Não consulta e-mail/telefone/endereço.

Se o aplicativo não puder ler nomes, tenta apenas o ID. Se não puder identificar o cliente, mantém indicação indisponível. Pode ser necessário liberar o acesso aos dados de clientes na configuração do aplicativo Shopify; não é possível comprovar essa permissão apenas com testes locais. Pedidos sem cadastro de cliente não são vinculados por suposição.

O resumo ao lado do cliente considera os pedidos já identificados no banco, de todos os períodos, na mesma loja e moeda, excluindo testes e cancelados. “Pagos” = status PAID; “pendentes” = PENDING, AUTHORIZED ou PARTIALLY_PAID. Valor pendente calculado = soma de max(total antes de devoluções − recebido, 0) nesses pedidos. Não confirma dívida, duplicidade de cobrança ou que todos os pedidos desse cliente foram importados/identificados. Não soma moedas diferentes. Identificar um novo pedido pode ampliar o resumo; histórico ainda não consultado não é apresentado como completo.

Verificações: testes de pagamentos/pendências por ID, homônimos, outra loja, outra moeda, nomes indisponíveis e atualização do nome. Autenticação e CSRF da nova rota incluídos nos testes HTTP.
