/** Safe diagnostic labels, shared by the row and batch summary. */
export function customerDiagnostic(code?: string): string {
  const labels: Record<string, string> = {
    identified: "Cliente identificado",
    access_denied:
      "Shopify negou acesso. Revise as permissões e o acesso aos dados de clientes do aplicativo de vendas.",
    name_access_denied:
      "Acesso ao nome negado pela Shopify. Revise o acesso aos dados de clientes do aplicativo de vendas.",
    name_query_failed:
      "Identificador consultado; a consulta do nome falhou. Tente novamente.",
    no_customer: "A Shopify retornou este pedido sem cliente vinculado.",
    name_unavailable: "Cliente vinculado, mas a Shopify não retornou o nome.",
    stale_order:
      "Pedido mudou na Shopify. Sincronize as vendas e consulte novamente.",
    order_unavailable:
      "Pedido não retornado pela Shopify. Confira sua disponibilidade e o acesso ao histórico de pedidos.",
    not_imported: "Pedido não encontrado na importação desta loja.",
    invalid_response:
      "Resposta da Shopify incompatível com o formato esperado. Requer revisão técnica.",
    query_failed:
      "Consulta falhou. Confira a conexão e autenticação e tente novamente.",
  };
  return labels[code || ""] || "Identificação ainda não consultada nesta tela.";
}
