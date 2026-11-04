/** Atendimento é independente de pagamento e de comprovação de entrega. */
export const fulfillmentLabels: Record<string, string> = {
  FULFILLED: "Atendido",
  FULFILLMENT_NOT_REQUIRED: "Não requer atendimento",
  UNFULFILLED: "Aguardando preparo",
  PARTIALLY_FULFILLED: "Parcialmente atendido",
  IN_PROGRESS: "Em preparo",
  ON_HOLD: "Em espera",
  SCHEDULED: "Atendimento agendado",
  READY_FOR_PICKUP: "Pronto para retirada",
  REQUEST_DECLINED: "Solicitação recusada",
  OPEN: "Aguardando preparo",
  PENDING_FULFILLMENT: "Solicitação pendente",
  RESTOCKED: "Reposto em estoque",
};

export const fulfillmentFilters = [
  "all",
  "AWAITING",
  "UNFULFILLED",
  "PARTIALLY_FULFILLED",
  "READY_FOR_PICKUP",
  "FULFILLED",
  "IN_PROGRESS",
  "ON_HOLD",
  "SCHEDULED",
  "FULFILLMENT_NOT_REQUIRED",
  "REQUEST_DECLINED",
  "OPEN",
  "PENDING_FULFILLMENT",
  "RESTOCKED",
] as const;
export type FulfillmentFilter = (typeof fulfillmentFilters)[number];
export const fulfillmentFilterLabels: Record<FulfillmentFilter, string> = {
  ...fulfillmentLabels,
  all: "Todos os atendimentos",
  AWAITING: "Aguardando atendimento · pagos",
  PENDING_FULFILLMENT: "Solicitação de atendimento pendente",
} as Record<FulfillmentFilter, string>;

export const fulfillmentDescriptions: Record<string, string> = {
  UNFULFILLED:
    "Nenhum item foi marcado como atendido. O início do preparo ainda não está confirmado.",
  IN_PROGRESS: "A Shopify registra o atendimento em andamento.",
  PARTIALLY_FULFILLED:
    "Parte dos itens foi atendida; confira abaixo o saldo de cada produto.",
  FULFILLED:
    "O atendimento foi concluído na Shopify. Isso não confirma a entrega ao cliente.",
  READY_FOR_PICKUP: "O pedido está registrado como pronto para retirada.",
  FULFILLMENT_NOT_REQUIRED: "Não há itens que precisem de atendimento.",
  ON_HOLD: "O atendimento está em espera na Shopify.",
  SCHEDULED: "O atendimento está programado para uma etapa futura.",
};
