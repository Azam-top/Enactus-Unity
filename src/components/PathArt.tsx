import type { PathId } from '../sections/Participation'

/*
  Quiet folded-paper drawings for the three visitor paths (bento card backgrounds). Paper tones only, one gold accent;
  decorative (the card hides them from assistive technology).
*/
const common = {
  viewBox: '0 0 420 300',
  preserveAspectRatio: 'xMaxYMin meet',
  className: 'absolute right-0 top-0 h-[58%] w-full',
  focusable: false,
} as const

export function PathArt({ id }: { id: PathId }) {
  if (id === 'idea') {
    return (
      <svg {...common} className="absolute right-0 top-0 h-[56%] w-full lg:h-[66%]">
        <path d="M24 226c64-12 104 18 168-8" fill="none" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 12" />
        <polygon points="60,190 380,40 230,214" fill="var(--paper-deep)" />
        <polygon points="230,214 380,40 282,246" fill="#d3c19a" />
        <polygon points="230,214 282,246 214,252" fill="var(--gold)" />
        <polyline points="60,190 230,214 214,252" fill="none" stroke="rgba(13,19,17,.22)" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    )
  }
  if (id === 'join') {
    return (
      <svg {...common}>
        <polygon points="70,280 190,110 310,280" fill="var(--paper-deep)" />
        <polygon points="190,280 300,90 410,280" fill="#d3c19a" />
        <polygon points="190,280 245,185 300,280" fill="var(--gold)" opacity=".9" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="230" cy="130" r="68" fill="none" stroke="var(--paper-deep)" strokeWidth="16" />
      <circle cx="304" cy="130" r="68" fill="none" stroke="#d3c19a" strokeWidth="16" />
      <circle cx="267" cy="130" r="11" fill="var(--gold)" />
    </svg>
  )
}
