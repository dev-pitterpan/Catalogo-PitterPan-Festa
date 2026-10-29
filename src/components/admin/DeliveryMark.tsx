import { Package, HelpCircle } from "lucide-react";
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
      ) : safe === "PICKUP" || safe === "OTHER" ? (
        <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <ellipse cx="32" cy="59" rx="21" ry="3" fill="#dce6f3" />
          <path
            d="M23 42L21 56M35 43L38 56"
            stroke="#344c90"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M20 58H26M36 58H43"
            stroke="#263b77"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M19 29Q19 24 26 23H32Q39 24 39 30V43H20Z" fill="#4c74b9" />
          <path
            d="M21 28L15 39L23 43M37 28L43 38"
            stroke="#e7b692"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="29" cy="14" r="9" fill="#f1c7a4" />
          <path
            d="M20 14Q18 2 29 3Q40 3 38 13L33 8Q28 13 20 10Z"
            fill="#34466d"
          />
          <path
            d="M27 17Q29 19 32 17"
            stroke="#ab7968"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <rect
            x="32"
            y="32"
            width="21"
            height="18"
            rx="3"
            fill="#ffd75e"
            stroke="#d6a62e"
            strokeWidth="1.5"
          />
          <path d="M39 32V39H45V32" fill="#fff2ba" />
          <path
            d="M37 43H43"
            stroke="#bc8c26"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M25 36L32 40"
            stroke="#f1c7a4"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
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
