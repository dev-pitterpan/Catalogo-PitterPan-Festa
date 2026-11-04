import type { CSSProperties } from "react";
import { SeasonalArt, type Motif } from "./SeasonalArt";

/** A camada atravessa a foto; o canal alfa do produto determina o que fica escondido. */
export default function CardCharacter({
  motif,
  mirrored,
  delay = 0,
}: {
  motif: Motif;
  mirrored: boolean;
  delay?: number;
}) {
  const movement =
    motif === "bunny" || motif === "egg"
      ? "hop"
      : motif === "balloon" || motif === "kite" || motif === "lantern"
        ? "float"
        : "peek";
  return (
    <span
      className={`card-character-layer ${mirrored ? "card-character-layer--mirrored" : ""}`}
      style={{ "--character-delay": `${delay}s` } as CSSProperties}
      aria-hidden="true"
    >
      <span
        className={`card-character-route card-character-route--${movement}`}
      >
        <span className={`card-character-art card-character-art--${motif}`}>
          <SeasonalArt motif={motif} />
        </span>
      </span>
    </span>
  );
}
