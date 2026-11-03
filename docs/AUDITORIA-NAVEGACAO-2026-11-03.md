# Auditoria de navegação — 03/11/2026

## Correções confirmadas

- O cartão Atendimento em aberto usava o mesmo destino de vendas gerais e não aplicava filtro de atendimento. Agora o cartão e Conferir atendimentos abrem a lista paginada com `fulfillment=AWAITING`. Contador, prévia operacional, pedidos, financeiro e produtos vendidos usam a mesma regra: pedidos pagos ou parcialmente reembolsados, com recebido maior que reembolsado, não cancelados e atendimento ainda não concluído/não dispensado. Prontos para retirada permanecem nesse conjunto.
- Vendas e pedidos ganha um seletor independente de Situação do atendimento, mantendo os filtros de pagamento, período, produto e entrega. Trocar um filtro reinicia a paginação e o carregamento de mais pedidos preserva o atendimento selecionado. A situação é carregada também quando o acesso vem de um link compartilhado. Links antigos `focus=operations` continuam abrindo a seleção de aguardando atendimento.
- A rolagem inicial reconhecia somente duas seções e podia sobrepor o destino `#sold-products`. Os três destinos internos passam a ser definidos em um único lugar: pedidos recentes, produtos vendidos e conferência operacional. Sem seção solicitada, vendas abre no topo.
- Atalhos de vendas carregam apenas filtros comerciais, sem transportar cursores e metadados de atualização. Reembolsos abrem a lista completa filtrada; atendimento em aberto não se confunde com pagamento pendente.
- No resumo de estoque, a seleção Acima do estoque baixo ganha consulta correspondente e texto consistente no link. Seu critério é quantidade maior que o limite baixo, tanto no catálogo local quanto no SQL, incluindo estoque alto e excluindo baixo, zerado, negativo e não informado.
- O resumo financeiro da Visão geral respeita a mesma regra de acesso do restante da área financeira, inclusive a herança de permissões de gerente de compras já definida no sistema.

## Cobertura de verificação

O teste HTTP percorre as seções Visão geral, Produtos, Vendas e pedidos, Mapa, Estoque, Ofertas, Catálogos, Agenda, Alterações, Sincronizações, Análises, Relatórios, Equipe, Configurações e o endereço legado de Calendário. Também coleta e consulta os destinos internos renderizados nessas páginas, recusando respostas de login, 404 e erro de seção para a sessão administrativa de teste.

Os testes de filtros verificam que um link de aguardando atendimento corresponde ao contador e permite percorrer todos os pedidos em páginas de dez, sem duplicação. Combinações com categoria, entrega, pagamento e data conferem os mesmos conjuntos no financeiro, na operação e nos produtos. Os filtros de estoque são comparados entre execução local e SQL, com casos nos limites e quantidade desconhecida. Testes anteriores de navegação do catálogo permanecem preservados.

Validação em ambiente local isolado, com sessão e dados de teste. Não substitui a navegação interativa com a sessão de produção nem a conferência dos dados do banco real. Não foram alterados dados da Shopify, regras financeiras ou credenciais.

## Resultado

84 testes automatizados aprovados. Compilação de produção aprovada. Percurso HTTP de 15 seções e 28 destinos internos renderizados concluído sem 404, desvio para login ou erro de seção na sessão administrativa de teste. Checkout, autenticação, cookies, CSRF e as verificações existentes também passaram.
