export type ReportColumn = {
  key: string;
  label: string;
  format?: "money" | "number" | "hours" | "percent";
  ratio?: [string, string];
};
export type ShopifyReport = {
  id: string;
  category: string;
  title: string;
  description: string;
  dataset: string;
  metrics: ReportColumn[];
  dimensions?: ReportColumn[];
  where?: string;
  series?: boolean;
  note?: string;
};
const money = (key: string, label: string): ReportColumn => ({
  key,
  label,
  format: "money",
});
const count = (key: string, label: string): ReportColumn => ({
  key,
  label,
  format: "number",
});
const dimension = (key: string, label: string): ReportColumn => ({
  key,
  label,
});
const rate = (
  key: string,
  label: string,
  numerator: string,
  denominator: string,
): ReportColumn => ({
  key,
  label,
  format: "percent",
  ratio: [numerator, denominator],
});
export const reportCategories = [
  {
    id: "sales",
    title: "Vendas",
    description: "Faturamento, ticket médio, canais e produtos.",
    icon: "sales",
  },
  {
    id: "orders",
    title: "Pedidos",
    description: "Volume, processamento, entregas e prazos.",
    icon: "orders",
  },
  {
    id: "acquisition",
    title: "Aquisição",
    description: "Sessões, dispositivos, cidades e origens.",
    icon: "acquisition",
  },
  {
    id: "behavior",
    title: "Comportamento",
    description: "Conversão, carrinho, checkout e páginas de entrada.",
    icon: "behavior",
  },
  {
    id: "customers",
    title: "Clientes",
    description: "Novos clientes, recorrência e compras.",
    icon: "customers",
  },
  {
    id: "marketing",
    title: "Marketing",
    description: "Referenciadores, canais e campanhas UTM.",
    icon: "marketing",
  },
  {
    id: "inventory",
    title: "Estoque",
    description: "Giro de produtos e movimentação do estoque.",
    icon: "inventory",
  },
  {
    id: "pos",
    title: "PDV",
    description: "Resultados por loja física e equipe de vendas.",
    icon: "pos",
  },
] as const;
export const shopifyReports: ShopifyReport[] = [
  {
    id: "sales-time",
    category: "sales",
    title: "Total de vendas ao longo do tempo",
    description: "Vendas brutas, líquidas e totais, dia a dia.",
    dataset: "sales",
    series: true,
    metrics: [
      money("total_sales", "Total de vendas"),
      money("gross_sales", "Vendas brutas"),
      money("net_sales", "Vendas líquidas"),
    ],
  },
  {
    id: "sales-breakdown",
    category: "sales",
    title: "Detalhamento do total de vendas",
    description: "Vendas, descontos, estornos, frete, taxas e tributos.",
    dataset: "sales",
    metrics: [
      money("gross_sales", "Vendas brutas"),
      money("discounts", "Descontos"),
      money("returns", "Estornos de vendas"),
      money("net_sales", "Vendas líquidas"),
      money("shipping_charges", "Cobranças de frete"),
      money("return_fees", "Taxas de devolução"),
      money("taxes", "Tributos"),
      money("total_sales", "Total de vendas"),
    ],
  },
  {
    id: "sales-channel",
    category: "sales",
    title: "Total de vendas por canal",
    description: "Resultados de cada canal de vendas.",
    dataset: "sales",
    dimensions: [dimension("sales_channel", "Canal de vendas")],
    metrics: [
      money("total_sales", "Total de vendas"),
      count("orders", "Pedidos"),
    ],
  },
  {
    id: "sales-product",
    category: "sales",
    title: "Total de vendas por produto",
    description: "Produtos ordenados pelo valor vendido.",
    dataset: "sales",
    dimensions: [dimension("product_title", "Produto")],
    metrics: [
      money("total_sales", "Total de vendas"),
      count("net_items_sold", "Itens líquidos vendidos"),
    ],
  },
  {
    id: "average-order",
    category: "sales",
    title: "Valor médio do pedido ao longo do tempo",
    description: "Ticket médio informado pela Shopify, por dia.",
    dataset: "sales",
    series: true,
    metrics: [
      money("average_order_value", "Valor médio do pedido"),
      count("orders", "Pedidos"),
    ],
    note: "O ticket médio é consultado diretamente; não somamos nem fazemos a média dos tickets diários.",
  },
  {
    id: "order-volume",
    category: "orders",
    title: "Pedidos e itens pedidos",
    description: "Quantidade de pedidos e unidades antes dos estornos.",
    dataset: "sales",
    series: true,
    metrics: [
      count("orders", "Pedidos"),
      count("quantity_ordered", "Itens pedidos"),
    ],
  },
  {
    id: "fulfillment-volume",
    category: "orders",
    title: "Pedidos processados, enviados e entregues",
    description: "Eventos de atendimento registrados pela Shopify.",
    dataset: "fulfillments",
    series: true,
    metrics: [
      count("orders_fulfilled", "Pedidos processados"),
      count("orders_shipped", "Pedidos enviados"),
      count("orders_delivered", "Pedidos entregues"),
    ],
    note: "Considera a data do evento de processamento, envio ou entrega. Processado não significa entregue.",
  },
  {
    id: "fulfillment-time",
    category: "orders",
    title: "Tempo do pedido ao processamento e à entrega",
    description: "Mediana de duração das etapas, em horas.",
    dataset: "fulfillments",
    series: true,
    metrics: [
      {
        key: "median_hours_order_to_fulfillment",
        label: "Até processamento",
        format: "hours",
      },
      {
        key: "median_hours_order_to_shipping",
        label: "Até envio",
        format: "hours",
      },
      {
        key: "median_hours_order_to_delivery",
        label: "Até entrega",
        format: "hours",
      },
    ],
    note: "Mediana é o valor central das durações, não a média. O valor vem da Shopify.",
  },
  {
    id: "sessions-time",
    category: "acquisition",
    title: "Sessões e visitantes ao longo do tempo",
    description: "Visitas e visitantes únicos da loja online.",
    dataset: "sessions",
    series: true,
    metrics: [
      count("sessions", "Sessões"),
      count("online_store_visitors", "Visitantes"),
    ],
    note: "Visitantes únicos são consultados novamente para o período completo; somar visitantes diários duplicaria pessoas.",
  },
  {
    id: "sessions-device",
    category: "acquisition",
    title: "Sessões por tipo de dispositivo",
    description: "Celular, desktop, tablet e demais dispositivos.",
    dataset: "sessions",
    dimensions: [dimension("session_device_type", "Dispositivo")],
    metrics: [
      count("sessions", "Sessões"),
      count("online_store_visitors", "Visitantes"),
    ],
  },
  {
    id: "sessions-location",
    category: "acquisition",
    title: "Sessões por local",
    description: "País, estado e cidade de origem das visitas.",
    dataset: "sessions",
    dimensions: [
      dimension("session_country", "País"),
      dimension("session_region", "Estado"),
      dimension("session_city", "Cidade"),
    ],
    metrics: [count("sessions", "Sessões")],
  },
  {
    id: "sessions-referrer",
    category: "acquisition",
    title: "Sessões por referenciador",
    description: "Tipos de origem e sites que levam visitantes à loja.",
    dataset: "sessions",
    dimensions: [
      dimension("referrer_source", "Tipo de origem"),
      dimension("referrer_name", "Referenciador"),
    ],
    metrics: [count("sessions", "Sessões")],
  },
  {
    id: "sessions-social",
    category: "acquisition",
    title: "Sessões por referenciador social",
    description: "Visitas originadas de redes sociais.",
    dataset: "sessions",
    where: "referrer_source = 'social'",
    dimensions: [dimension("referrer_name", "Rede social")],
    metrics: [count("sessions", "Sessões")],
  },
  {
    id: "conversion-funnel",
    category: "behavior",
    title: "Detalhamento da taxa de conversão",
    description: "Sessões, adições ao carrinho, checkout e compras.",
    dataset: "sessions",
    metrics: [
      count("sessions", "Sessões"),
      count("sessions_with_cart_additions", "Sessões com carrinho"),
      count(
        "sessions_that_reached_checkout",
        "Sessões que chegaram ao checkout",
      ),
      count("sessions_that_completed_checkout", "Sessões com compra"),
      rate(
        "conversion_rate",
        "Taxa de conversão",
        "sessions_that_completed_checkout",
        "sessions",
      ),
    ],
  },
  {
    id: "conversion-time",
    category: "behavior",
    title: "Taxa de conversão ao longo do tempo",
    description: "Compras em relação às sessões, por dia.",
    dataset: "sessions",
    series: true,
    metrics: [
      rate(
        "conversion_rate",
        "Taxa de conversão",
        "sessions_that_completed_checkout",
        "sessions",
      ),
      count("sessions", "Sessões"),
      count("sessions_that_completed_checkout", "Sessões com compra"),
    ],
  },
  {
    id: "landing-pages",
    category: "behavior",
    title: "Sessões por página de destino",
    description: "As páginas pelas quais os visitantes entram na loja.",
    dataset: "sessions",
    dimensions: [
      dimension("landing_page_type", "Tipo de página"),
      dimension("landing_page_path", "Página de entrada"),
    ],
    metrics: [count("sessions", "Sessões")],
  },
  {
    id: "customer-type",
    category: "customers",
    title: "Clientes novos x recorrentes",
    description: "Clientes, pedidos e vendas por tipo de comprador.",
    dataset: "sales",
    dimensions: [dimension("new_or_returning_customer", "Tipo de cliente")],
    metrics: [
      count("customers", "Clientes"),
      count("orders", "Pedidos"),
      money("total_sales", "Total de vendas"),
    ],
  },
  {
    id: "customer-returning",
    category: "customers",
    title: "Taxa de clientes recorrentes ao longo do tempo",
    description: "Participação dos clientes que já compraram antes.",
    dataset: "sales",
    series: true,
    metrics: [
      rate(
        "returning_customer_rate",
        "Taxa de clientes recorrentes",
        "returning_customers",
        "customers",
      ),
      count("returning_customers", "Clientes recorrentes"),
      count("customers", "Clientes"),
    ],
  },
  {
    id: "customer-new",
    category: "customers",
    title: "Novos clientes ao longo do tempo",
    description: "Aquisição de clientes pela data da primeira compra.",
    dataset: "customers",
    series: true,
    metrics: [count("new_customer_records", "Novos clientes")],
  },
  {
    id: "marketing-referrer",
    category: "marketing",
    title: "Total de vendas por referenciador",
    description: "Canal e plataforma da última visita antes do pedido.",
    dataset: "sales",
    dimensions: [
      dimension("referring_channel", "Canal de origem"),
      dimension("referring_platform", "Plataforma"),
    ],
    metrics: [
      money("total_sales", "Total de vendas"),
      count("orders", "Pedidos"),
    ],
    note: "A origem da última visita não é o mesmo indicador que as vendas atribuídas de uma campanha.",
  },
  {
    id: "marketing-social",
    category: "marketing",
    title: "Vendas por rede social",
    description: "Vendas e pedidos por plataforma de origem social.",
    dataset: "sales",
    where: "referring_medium = 'social'",
    dimensions: [dimension("referring_platform", "Rede social")],
    metrics: [
      money("total_sales", "Total de vendas"),
      count("orders", "Pedidos"),
    ],
    note: "Considera a origem social da última visita antes do pedido, conforme registrada pela Shopify.",
  },
  {
    id: "marketing-channel",
    category: "marketing",
    title: "Desempenho por canal de marketing",
    description: "Vendas atribuídas por canal e tipo de tráfego.",
    dataset: "campaign_sales",
    dimensions: [
      dimension("referring_channel", "Canal"),
      dimension("traffic_type", "Tipo de tráfego"),
    ],
    metrics: [
      money("campaign_last_non_direct_click_total_sales", "Vendas atribuídas"),
      count("campaign_last_non_direct_click_order_count", "Pedidos atribuídos"),
    ],
    note: "Modelo de atribuição: último clique não direto da Shopify. Pode diferir de vendas totais e dos relatórios das plataformas de anúncios.",
  },
  {
    id: "marketing-utm",
    category: "marketing",
    title: "Detalhes com UTM",
    description: "Resultados atribuídos por origem, mídia e campanha.",
    dataset: "campaign_sales",
    dimensions: [
      dimension("utm_source", "Origem UTM"),
      dimension("utm_medium", "Mídia UTM"),
      dimension("utm_campaign", "Campanha UTM"),
    ],
    metrics: [
      money("campaign_last_non_direct_click_total_sales", "Vendas atribuídas"),
      count("campaign_last_non_direct_click_order_count", "Pedidos atribuídos"),
    ],
    note: "Modelo de atribuição: último clique não direto. Depende das UTMs e dos dados registrados pela Shopify.",
  },
  {
    id: "inventory-sellthrough",
    category: "inventory",
    title: "Produtos por taxa de sell-through",
    description: "Participação das unidades vendidas no estoque disponível.",
    dataset: "inventory",
    where: "inventory_is_tracked = true",
    dimensions: [
      dimension("product_title", "Produto"),
      dimension("product_variant_title", "Variante"),
      dimension("product_variant_sku", "SKU"),
    ],
    metrics: [
      rate(
        "sell_through_rate",
        "Sell-through",
        "inventory_units_sold",
        "available_units",
      ),
      count("inventory_units_sold", "Unidades vendidas"),
      count("ending_inventory_units", "Estoque final"),
    ],
    note: "Fórmula Shopify: unidades vendidas ÷ (unidades vendidas + estoque final). Usa o histórico de estoque da Shopify, não o estoque atual do catálogo.",
  },
  {
    id: "inventory-movement",
    category: "inventory",
    title: "Movimentação do estoque",
    description: "Estoque inicial, unidades vendidas e estoque final.",
    dataset: "inventory",
    where: "inventory_is_tracked = true",
    series: true,
    metrics: [
      count("inventory_units_sold", "Unidades vendidas"),
      count("starting_inventory_units", "Estoque inicial"),
      count("ending_inventory_units", "Estoque final"),
    ],
  },
  {
    id: "pos-location",
    category: "pos",
    title: "Total de vendas por local de PDV",
    description: "Resultados por loja física identificada nos pedidos.",
    dataset: "sales",
    where: "pos_location_name IS NOT NULL",
    dimensions: [dimension("pos_location_name", "Local de PDV")],
    metrics: [
      money("total_sales", "Total de vendas"),
      count("orders", "Pedidos"),
    ],
  },
  {
    id: "pos-team",
    category: "pos",
    title: "Total de vendas por membro da equipe de PDV",
    description: "Vendas por loja e colaborador identificado na Shopify.",
    dataset: "sales",
    where: "pos_location_name IS NOT NULL",
    dimensions: [
      dimension("pos_location_name", "Loja"),
      dimension("staff_member_name", "Membro da equipe"),
    ],
    metrics: [
      money("total_sales", "Total de vendas"),
      count("orders", "Pedidos"),
    ],
  },
];
export function reportById(id: string) {
  return shopifyReports.find((r) => r.id === id);
}
