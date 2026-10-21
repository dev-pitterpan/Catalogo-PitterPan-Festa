import { SeasonalArt } from "./SeasonalArt";

/** Composição única: as renas puxam o trenó e atravessam a página juntas. */
export default function SantaSleigh() {
  return (
    <svg viewBox="0 0 440 180" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M100 94q68 28 175 10M203 97q35 17 72 7"
        stroke="#dbbb79"
        strokeWidth="1.5"
      />
      {[0, 108].map((offset, index) => (
        <g key={offset} transform={`translate(${offset} ${index ? 9 : 0})`}>
          <g className="sleigh-deer-body">
            <path
              d="m41 72-6-24 4-17m-4 17-12-9m15 0 9-9m-4 21 12-12"
              stroke="#8b654f"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M46 82 34 63 18 68l-6 13 24 7 15 19 44-2 11-17-12-12-27 1z"
              fill="#c69265"
            />
            <path d="m39 67 13-9-2 16" fill="#d8ad7d" />
            <ellipse cx="77" cy="94" rx="27" ry="17" fill="#bd855c" />
            <path d="m99 88 14-5-8 13" fill="#e0bd92" />
            <path d="m47 80 8 17" stroke="#b83146" strokeWidth="6" />
            <circle cx="52" cy="91" r="3" fill="#efce89" />
            <circle cx="29" cy="76" r="2" fill="#3a2c2b" />
            <circle
              cx="13"
              cy="81"
              r="4"
              fill={index ? "#714c42" : "#cf3e47"}
            />
            <g className="sleigh-deer-legs sleigh-deer-legs--front">
              <path
                d="m57 103-16 19-16-3m58-16 8 19 15 5"
                stroke="#9e6d4f"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </g>
            <g className="sleigh-deer-legs sleigh-deer-legs--back">
              <path
                d="m65 104 1 21-15 8m42-31 15 12 12-8"
                stroke="#c08d63"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </g>
          </g>
        </g>
      ))}
      <path d="M348 76q-18-41 17-46 23 3 20 25l-8 32" fill="#977b55" />
      <path
        d="m362 34 14-7m-15 12 20-4"
        stroke="#dec68e"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <SeasonalArt motif="santa" x="278" y="24" width="82" height="82" />
      <path
        d="M263 94q10 16 28 11l70-2 13-22q12 6 8 22l-17 31h-78l-24-23z"
        fill="#b63044"
      />
      <path
        d="M274 108h83m-71 28 72-1"
        stroke="#e9c77e"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M287 135v12m66-12v12m-84-1h99q25 0 28-19"
        stroke="#d8b571"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="m318 113 5 7-5 7-5-7z" fill="#f4d697" />
      <g fill="#f0d9a6" opacity=".65">
        <path d="m409 105 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
        <circle cx="430" cy="122" r="2" />
        <circle cx="406" cy="142" r="1.5" />
      </g>
    </svg>
  );
}
