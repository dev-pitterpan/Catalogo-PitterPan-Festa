import type { SVGProps } from "react";
export type Motif =
  | "spider"
  | "bat"
  | "santa"
  | "deer"
  | "snow"
  | "balloon"
  | "kite"
  | "bunny"
  | "egg"
  | "lantern"
  | "flags"
  | "spark";

/** Ilustrações vetoriais locais: leves, nítidas e sem fontes ou imagens externas. */
export function SeasonalArt({
  motif,
  ...props
}: SVGProps<SVGSVGElement> & { motif: Motif }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {motif === "spider" && (
        <g stroke="#25202e" strokeWidth="3" strokeLinecap="round">
          <path
            className="seasonal-spider-legs"
            d="M49 52 32 39 20 46M47 59 25 54 14 65M47 68 28 72 23 86M50 75 40 89 43 99M71 52 88 39 100 46M73 59 95 54 106 65M73 68 92 72 97 86M70 75 80 89 77 99"
          />
          <ellipse cx="60" cy="67" rx="18" ry="23" fill="#25202e" />
          <circle cx="60" cy="46" r="12" fill="#393041" />
          <path d="M60 0V33" stroke="#b8afc6" strokeWidth="1" />
          <circle cx="55" cy="44" r="2" fill="#ffc078" stroke="none" />
          <circle cx="65" cy="44" r="2" fill="#ffc078" stroke="none" />
          <path d="m58 66 3-5 3 5-3 5z" fill="#ef8b42" stroke="none" />
        </g>
      )}
      {motif === "bat" && (
        <g fill="#272333" stroke="#a59bb6" strokeWidth="1">
          <path
            className="seasonal-wing seasonal-wing--left"
            d="M58 54C42 29 15 28 3 39c17 1 10 13 12 20 10-9 17-1 19 8 9-7 17-2 23 8z"
          />
          <path
            className="seasonal-wing seasonal-wing--right"
            d="M62 54c16-25 43-26 55-15-17 1-10 13-12 20-10-9-17-1-19 8-9-7-17-2-23 8z"
          />
          <path d="m50 44 1-15 9 9 9-9 1 15c13 17 3 39-10 42-13-3-23-25-10-42z" />
          <path
            d="m55 49 3 1m4 0 3-1"
            stroke="#ffc078"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )}
      {motif === "santa" && (
        <g>
          <path d="M22 117c0-31 13-42 38-42s38 11 38 42" fill="#b93043" />
          <path d="M51 88h18v29H51" fill="#fff5e5" />
          <path d="M32 50C28 14 76 6 90 43L70 36" fill="#c83d4c" />
          <circle cx="91" cy="43" r="8" fill="#fff5e5" />
          <ellipse cx="60" cy="65" rx="28" ry="31" fill="#f2c7a5" />
          <path
            d="M33 66c-5 32 18 43 27 45 9-2 32-13 27-45L74 82H46z"
            fill="#fff5e5"
          />
          <rect x="29" y="40" width="56" height="13" rx="6" fill="#fff5e5" />
          <path
            d="M43 64h7m20 0h7"
            stroke="#493744"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <ellipse cx="60" cy="75" rx="7" ry="5" fill="#eaa58d" />
          <path
            d="M43 80q8-9 17-2 9-7 17 2-12 12-17 3-5 9-17-3"
            fill="#fff5e5"
          />
          <path
            className="seasonal-wave"
            d="M25 91 12 73"
            stroke="#b93043"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <circle cx="11" cy="70" r="7" fill="#fff5e5" />
        </g>
      )}
      {motif === "deer" && (
        <g
          stroke="#785344"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M40 42 28 24V7m0 17L15 17m13 2L40 9M80 42l12-18V7m0 17 13-7M92 19 80 9" />
          <path
            d="M40 51C9 29 16 67 39 64m41-13c31-22 24 16 1 13"
            fill="#c99263"
          />
          <path
            d="M36 53c0-23 48-23 48 0v28c0 32-48 32-48 0z"
            fill="#c99263"
            stroke="none"
          />
          <ellipse
            cx="60"
            cy="90"
            rx="21"
            ry="15"
            fill="#f0d6b2"
            stroke="none"
          />
          <ellipse cx="60" cy="84" rx="9" ry="7" fill="#bc3546" stroke="none" />
          <path d="M45 64v4m30-4v4" stroke="#362d32" />
          <path d="M40 111h40" stroke="#bc3546" strokeWidth="10" />
        </g>
      )}
      {motif === "snow" && (
        <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M60 15v90M21 38l78 44M21 82l78-44M48 25l12 12 12-12M48 95l12-12 12 12M24 52l17-4-4-17M83 89l-4-17 17-4M37 89l4-17-17-4M96 52l-17-4 4-17" />
        </g>
      )}
      {motif === "balloon" && (
        <g>
          <path d="M59 74c-19 17 21 23-1 46" stroke="#e8cfa2" strokeWidth="2" />
          <path d="m60 69-7 12h14z" fill="#ca557a" />
          <ellipse cx="60" cy="42" rx="29" ry="35" fill="#e989a7" />
          <path
            d="M42 36q0-13 12-18"
            stroke="#fff4e9"
            strokeWidth="5"
            strokeLinecap="round"
            opacity=".7"
          />
        </g>
      )}
      {motif === "kite" && (
        <g>
          <path d="m60 7 36 38-36 43L25 45z" fill="#edbd64" />
          <path d="m60 7 1 39-36-1zm1 39 35-1-36 43z" fill="#7eacd0" />
          <path d="M60 88q-17 13 4 27" stroke="#d9cbb5" strokeWidth="2" />
          <path d="m56 95-12-3 3 10zm4 13 12-3-3 10z" fill="#dc8096" />
        </g>
      )}
      {motif === "bunny" && (
        <g>
          <ellipse
            cx="44"
            cy="33"
            rx="13"
            ry="31"
            transform="rotate(-12 44 33)"
            fill="#fbebd9"
          />
          <ellipse
            cx="76"
            cy="33"
            rx="13"
            ry="31"
            transform="rotate(12 76 33)"
            fill="#fbebd9"
          />
          <path
            d="m44 17 4 32m28-32-4 32"
            stroke="#e5aab2"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <ellipse cx="60" cy="81" rx="39" ry="33" fill="#fbebd9" />
          <path
            d="M44 77v3m32-3v3"
            stroke="#68556b"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="m55 88 5 5 5-5" fill="#d487a0" />
          <path
            d="M60 94v5m-26-8-17-3m17 10-17 3m69-10 17-3m-17 10 17 3"
            stroke="#bdacb7"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}
      {motif === "egg" && (
        <g>
          <path
            d="M30 75c0-27 20-61 30-61s30 34 30 61c0 40-60 40-60 0"
            fill="#b5a0cf"
          />
          <path
            d="m35 49 12 7 13-7 13 7 12-7M31 79l14-8 15 8 15-8 14 8"
            stroke="#ffe4ad"
            strokeWidth="6"
          />
          <circle cx="60" cy="95" r="4" fill="#fff0d6" />
        </g>
      )}
      {motif === "lantern" && (
        <g>
          <path d="M60 1v14" stroke="#edcc93" strokeWidth="2" />
          <path d="m60 15 31 33-14 41H43L29 48z" fill="#da8c58" />
          <path d="m60 15-13 33 5 41h16l5-41z" fill="#f3c272" />
          <path d="M29 48h62M43 89h34" stroke="#885c4e" strokeWidth="3" />
          <path
            d="m48 92-5 20m17-20v25m12-25 5 20"
            stroke="#efb47a"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )}
      {motif === "flags" && (
        <g>
          <path d="M3 33q57 27 114 0" stroke="#e5c99e" strokeWidth="2" />
          <path
            d="m10 36 24 8-3 31-13-15-10 7zm38 11h24l-2 30-10-12-11 12zm39-3 23-8 2 30-12-6-10 15z"
            fill="#d98b79"
          />
          <path d="m48 47 24 0-2 30-10-12-11 12z" fill="#edc574" />
        </g>
      )}
      {motif === "spark" && (
        <path
          d="M60 18q3 39 42 42-39 3-42 42-3-39-42-42 39-3 42-42"
          fill="currentColor"
        />
      )}
    </svg>
  );
}
