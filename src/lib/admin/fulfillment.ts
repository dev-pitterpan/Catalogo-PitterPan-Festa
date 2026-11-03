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
