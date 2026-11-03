/** Atendimento é independente de pagamento e de comprovação de entrega. */
export const fulfillmentLabels: Record<string, string> = {
  FULFILLED: "Atendimento concluído",
  FULFILLMENT_NOT_REQUIRED: "Atendimento não necessário",
  UNFULFILLED: "Atendimento pendente",
  PARTIALLY_FULFILLED: "Atendimento parcial",
  IN_PROGRESS: "Em preparação",
  ON_HOLD: "Em espera",
  SCHEDULED: "Programado",
  READY_FOR_PICKUP: "Pronto para retirada",
  REQUEST_DECLINED: "Solicitação recusada",
  OPEN: "Em aberto",
  PENDING_FULFILLMENT: "Atendimento pendente",
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
