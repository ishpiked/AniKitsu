import { useId } from "react";
import { cn } from "cn";

export function Logo({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      role="img"
      aria-label="Kitsu logo"
      className={cn("size-8 shrink-0", className)}
    >
      <defs>
        <linearGradient
          id={`kitsu-logo-gradient-${id}`}
          x1="66"
          y1="32"
          x2="441"
          y2="481"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#171717" />
          <stop offset="1" stopColor="#050505" />
        </linearGradient>
        <clipPath         id={`kitsu-logo-circle-${id}`}>
          <circle cx="256" cy="256" r="256" />
        </clipPath>
      </defs>
      <circle
        cx="256"
        cy="256"
        r="256"
        fill={`url(#kitsu-logo-gradient-${id})`}
      />
      <g clipPath={`url(#kitsu-logo-circle-${id})`}>
        <path
          d="M-42 38C37 10 74 62 73 125c-1 58 47 91 109 81 55-9 103-47 153-22 46 23 27 70-23 91-45 19-103 14-135 48-30 32-7 72 43 96 54 25 91 58 68 100H-42V38Z"
          fill="#858585"
          fillOpacity=".16"
        />
        <path
          d="M293-28c-66 63-76 103-35 124 41 20 108-6 144 22 43 34 18 79-22 112-41 34-49 74-11 99 40 26 105-1 145 28 47 34 27 89-15 125v58H293c46-52 47-91 9-112-42-23-111-5-140-40-31-38 4-78 50-101 48-24 60-61 22-82-44-24-124 4-166-31-36-30-15-73 36-123l27-79h162Z"
          fill="#777777"
          fillOpacity=".12"
        />
        <path
          d="M-37 333c58-47 111-42 144-3 32 38 20 82-23 122-31 29-55 56-64 97h-57V333Z"
          fill="#929292"
          fillOpacity=".14"
        />
        <path
          d="M373 333c55-30 105-16 146 25v157h-95c-41-47-61-93-51-132Z"
          fill="#666666"
          fillOpacity=".12"
        />
      </g>
      <path d="M183 157h45l-55 56h-29v-16c0-22 17-40 39-40Z" fill="#FFFFFF" />
      <path d="M260 157h53l-56 56h-52l55-56Z" fill="#FFFFFF" />
      <path d="M342 159c16 6 26 22 26 39v15h-78l52-54Z" fill="#FFFFFF" />
      <path d="M144 228h224v79c0 29-23 52-52 52H196c-29 0-52-23-52-52v-79Z" fill="#FFFFFF" />
      <rect x="181" y="255" width="120" height="26" rx="13" fill="#111111" />
      <rect x="181" y="298" width="73" height="26" rx="13" fill="#111111" />
    </svg>
  );
}
