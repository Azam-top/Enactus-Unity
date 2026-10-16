import { useId, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Icon as SiteIcon } from "@/components/Icon"

/*
  Magic UI "bento-grid" (https://magicui.design/docs/components/bento-grid), adapted to this site.
  Kept: the grid, the card anatomy (background / icon / name / description / call to action), the hover choreography
  (icon shrinks, text lifts, the call to action rises in).
  Changed — and why:
   • the call to action is the card's own control: the whole card is one real <button> (or <a> when `href` is given),
     so it is keyboard- and screen-reader-operable; the visible "cta" text is its visual twin (aria-hidden);
   • the hover-only call to action also appears on keyboard focus (group-focus-within) — nothing exists only on hover;
   • shadcn <Button> and @radix-ui/react-icons are replaced by the site's own link style and <Icon name="arrow">
     (two fewer dependencies); dark-mode classes are dropped (the site has a single light theme);
   • colours come from the site tokens (bg-card, text-foreground, text-muted-foreground), never raw neutrals.
*/

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
  name: string
  className?: string
  background: ReactNode
  Icon: ElementType
  description: string
  cta: string
  /** Link mode (original behaviour): the whole card is an anchor. */
  href?: string
  /** Button mode: the whole card toggles something (e.g. opens a form panel). */
  onSelect?: () => void
  /** Button mode: reflects the toggled state to assistive technology. */
  pressed?: boolean
  /** Button mode: id of the region this card controls. */
  controls?: string
  /** Decoration drawn over the card (e.g. a border beam). Must be non-interactive. */
  children?: ReactNode
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn("grid w-full grid-cols-1 gap-4 lg:auto-rows-[17.5rem] lg:grid-cols-3", className)}
      {...props}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  cta,
  href,
  onSelect,
  pressed,
  controls,
  children,
  ...props
}: BentoCardProps) => {
  const uid = useId()
  const nameId = `${uid}-name`
  const descId = `${uid}-desc`
  const ctaId = `${uid}-cta`
  const hit =
    "absolute inset-0 z-20 m-0 cursor-pointer appearance-none rounded-[inherit] border-0 bg-transparent p-0 outline-offset-[-4px] focus-visible:outline-[3px] focus-visible:outline-foreground"
  const ctaClass = "inline-flex items-center gap-2 text-[15px] font-semibold text-foreground underline underline-offset-4"

  return (
    <div
      className={cn(
        "group relative flex min-h-[19rem] flex-col justify-between overflow-hidden rounded-[14px] transform-gpu lg:min-h-0",
        "border border-border bg-card",
        "transition-[border-color,box-shadow] duration-200",
        "hover:border-foreground",
        pressed && "border-foreground [box-shadow:inset_0_-4px_0_var(--color-primary)]",
        className
      )}
      {...props}
    >
      <div aria-hidden="true">{background}</div>

      <div className="p-5 md:p-6">
        <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-10 lg:group-focus-within:-translate-y-10">
          <Icon className="mb-3 h-12 w-12 origin-left transform-gpu text-foreground transition-all duration-300 ease-in-out group-hover:scale-75 group-focus-within:scale-75" />
          <h3 id={nameId} className="text-2xl leading-tight tracking-tight text-foreground lg:text-[1.7rem]">
            {name}
          </h3>
          <p id={descId} className="max-w-lg text-base text-muted-foreground">
            {description}
          </p>
        </div>

        {/* Touch and small screens: the call to action is always visible. */}
        <div aria-hidden="true" className="pointer-events-none mt-4 flex w-full flex-row items-center lg:hidden">
          <span className={ctaClass}>
            {cta}
            <SiteIcon name="arrow" size={16} />
          </span>
        </div>
      </div>

      {/* Large screens: the call to action rises in on hover and on keyboard focus. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 hidden w-full translate-y-10 transform-gpu flex-row items-center p-6 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 lg:flex"
      >
        <span className={ctaClass}>
          {cta}
          <SiteIcon name="arrow" size={16} />
        </span>
      </div>

      {href ? (
        <a href={href} className={hit} aria-labelledby={`${nameId} ${ctaId}`} aria-describedby={descId}>
          <span id={ctaId} className="visually-hidden">{cta}</span>
        </a>
      ) : (
        <button
          type="button"
          className={hit}
          onClick={onSelect}
          aria-pressed={pressed}
          aria-controls={controls}
          aria-labelledby={`${nameId} ${ctaId}`}
          aria-describedby={descId}
        >
          <span id={ctaId} className="visually-hidden">{cta}</span>
        </button>
      )}

      <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[0.03]" />
      {children}
    </div>
  )
}

export { BentoCard, BentoGrid }
