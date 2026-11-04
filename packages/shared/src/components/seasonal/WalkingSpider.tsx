import type { CSSProperties } from "react";

/** Oito pernas articuladas e duas camadas: passa à frente e atrás da imagem real. */
export default function WalkingSpider({
  mirrored = false,
}: {
  mirrored?: boolean;
}) {
  return (
    <span
      className={`walking-spider-layer${mirrored ? " walking-spider-layer--mirrored" : ""}`}
      aria-hidden="true"
    >
      <span className="walking-spider-route">
        <span className="walking-spider-thread" />
        <span className="walking-spider-heading">
          <svg
            className="walking-spider"
            viewBox="0 0 100 100"
            fill="none"
            focusable="false"
          >
            {[-1, 1].flatMap((side) =>
              [0, 1, 2, 3].map((pair) => (
                <g
                  key={`${side}-${pair}`}
                  className={`walking-spider-leg walking-spider-leg--${pair}`}
                  style={
                    {
                      transformOrigin: `${50 + side * 8}px ${43 + pair * 6}px`,
                      "--leg-sign": (pair % 2 === 0 ? 1 : -1) * side,
                    } as CSSProperties
                  }
                >
                  <path
                    d={`M${50 + side * 8} ${43 + pair * 6} L${50 + side * (26 + (pair === 0 || pair === 3 ? -3 : 1))} ${22 + pair * 16} l${side * 10} ${pair < 2 ? -9 : 9}`}
                    stroke="#342c3c"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={`M${50 + side * 8} ${43 + pair * 6} L${50 + side * (26 + (pair === 0 || pair === 3 ? -3 : 1))} ${22 + pair * 16}`}
                    stroke="#716178"
                    strokeWidth=".7"
                    strokeLinecap="round"
                  />
                </g>
              )),
            )}
            <g className="walking-spider-body">
              <ellipse cx="50" cy="62" rx="13" ry="19" fill="#292330" />
              <ellipse cx="47" cy="57" rx="7" ry="11" fill="#403448" />
              <ellipse cx="50" cy="40" rx="10" ry="11" fill="#3b3044" />
              <path d="m47 64 3-4 3 4-3 4z" fill="#d88c57" />
              <circle cx="46" cy="36" r="1.6" fill="#f4cd8a" />
              <circle cx="54" cy="36" r="1.6" fill="#f4cd8a" />
            </g>
          </svg>
        </span>
      </span>
    </span>
  );
}
