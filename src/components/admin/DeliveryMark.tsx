import { Package, PersonStanding, Truck, HelpCircle } from "lucide-react";
import { deliveryLabels, type DeliveryKind } from "../../lib/admin/delivery";
export default function DeliveryMark({
  kind,
  units,
  label = true,
}: {
  kind: DeliveryKind | string;
  units?: string | number;
  label?: boolean;
}) {
  const safe = Object.prototype.hasOwnProperty.call(deliveryLabels, kind)
    ? (kind as DeliveryKind)
    : "UNKNOWN";
  return (
    <span
      className={`delivery-mark delivery-mark--${safe.toLowerCase()}`}
      title={deliveryLabels[safe]}
    >
      {safe === "MOTOBOY" ? (
        <svg viewBox="0 0 64 44" fill="none" aria-hidden="true">
          <circle cx="13" cy="32" r="9" stroke="currentColor" strokeWidth="4" />
          <circle cx="51" cy="32" r="9" stroke="currentColor" strokeWidth="4" />
          <path
            d="M14 30L25 17H40L48 30M24 19L30 31H40M38 10H45L51 31M21 12H31M26 18V12"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="6"
            y="7"
            width="14"
            height="13"
            rx="3"
            fill="#ffd51a"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      ) : safe === "SEDEX" ? (
        <svg viewBox="0 0 76 44" aria-hidden="true">
          <path d="M4 8H49V32H4Z" fill="#ffd51a" />
          <path d="M49 17H61L71 27V33H49Z" fill="#354ba7" />
          <path d="M53 19H59L65 26H53Z" fill="#e7efff" />
          <circle cx="17" cy="34" r="7" fill="#263b77" />
          <circle cx="59" cy="34" r="7" fill="#263b77" />
          <text
            x="26"
            y="24"
            fill="#263b77"
            fontSize="10"
            fontWeight="800"
            textAnchor="middle"
          >
            SEDEX
          </text>
        </svg>
      ) : safe === "PICKUP" ? (
        <PersonStanding aria-hidden="true" />
      ) : safe === "OTHER" ? (
        <Truck aria-hidden="true" />
      ) : safe === "MIXED" ? (
        <Package aria-hidden="true" />
      ) : (
        <HelpCircle aria-hidden="true" />
      )}
      {label && <span>{deliveryLabels[safe]}</span>}
      {units !== undefined && (
        <b>
          {units}
          <small> un.</small>
        </b>
      )}
      {!label && <span className="admin-sr-only">{deliveryLabels[safe]}</span>}
    </span>
  );
}
