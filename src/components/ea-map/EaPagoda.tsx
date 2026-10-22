"use client";

import { useId } from "react";
import { cx } from "./shared";
import s from "./ea-assist.module.css";

/** Pagoda, the mascot of the EA Map assistant: a small white and blue robot with a dark
 *  visor and smiling eyes. Pure SVG, so it stays crisp at every size and in both themes. */
export function PagodaAvatar({ size = 40, thinking = false, className }: { size?: number; thinking?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      className={cx(s.pagoda, thinking && s.pagodaThinking, className)}
    >
      <defs>
        <linearGradient id={`${id}-shell`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe8f6" />
        </linearGradient>
        <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3d8bff" />
          <stop offset="1" stopColor="#0a4fc4" />
        </linearGradient>
        <linearGradient id={`${id}-visor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a2b55" />
          <stop offset="1" stopColor="#081330" />
        </linearGradient>
      </defs>
      {/* antenna */}
      <line x1="32" y1="12" x2="32" y2="6.5" stroke={`url(#${id}-blue)`} strokeWidth="2.6" strokeLinecap="round" />
      <circle className={s.pagodaBulb} cx="32" cy="5.5" r="3.6" fill={`url(#${id}-blue)`} />
      {/* ear pods */}
      <rect x="4" y="25" width="9" height="16" rx="4.5" fill={`url(#${id}-blue)`} />
      <rect x="51" y="25" width="9" height="16" rx="4.5" fill={`url(#${id}-blue)`} />
      {/* head */}
      <rect x="9" y="11" width="46" height="42" rx="19" fill={`url(#${id}-shell)`} stroke="#c9d7ee" strokeWidth="1" />
      {/* visor */}
      <rect x="14.5" y="18" width="35" height="26" rx="12" fill={`url(#${id}-visor)`} />
      <ellipse cx="24" cy="22.5" rx="7" ry="2.2" fill="#ffffff" opacity="0.14" />
      {/* smiling eyes */}
      <g className={s.pagodaEyes} stroke="#45d6ff" strokeWidth="2.8" strokeLinecap="round" fill="none">
        <path d="M21 33.5 q4.5 -6 9 0" />
        <path d="M34 33.5 q4.5 -6 9 0" />
      </g>
    </svg>
  );
}
