import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLocale, useT } from './content/LocaleContext'
import { useMotion } from './motion/MotionContext'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Hero } from './sections/Hero'
import { Participation, type PathId } from './sections/Participation'
import { Projects } from './sections/Projects'
import { Team } from './sections/Team'
import { Story } from './sections/Story'
import { University } from './sections/University'
import { FinalAction } from './sections/FinalAction'
import { refreshAfterFonts, ScrollTrigger } from './motion/motion'

export function Home() {
  const t = useT()
  const locale = useLocale()
  const { reduced } = useMotion()
  const { hash } = useLocation()
  const [path, setPath] = useState<PathId | null>(null)
  const [contextTag, setContextTag] = useState<string | null>(null)
  const [focusToken, setFocusToken] = useState(0)

  useEffect(() => {
    refreshAfterFonts()
  }, [])

  // Text length differs per language: re-measure scroll positions once after a locale change.
  useEffect(() => {
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(frame)
  }, [locale])

  // Arriving from another page (e.g. privacy) with #section in the URL.
  useEffect(() => {
    if (!hash) return
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView())
    return () => cancelAnimationFrame(frame)
    // Only on arrival: later hash changes come from in-page anchors that scroll natively.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Any "share an idea" style entry point opens a path, scrolls to it and moves focus to its heading.
  const openPath = useCallback(
    (next: PathId, context?: string) => {
      setPath(next)
      if (context) setContextTag(context)
      history.replaceState(null, '', '#participate')
      // Wait a frame so the panel exists. On narrow screens the paths stack tall, so go straight to the panel.
      requestAnimationFrame(() => {
        const narrow = window.matchMedia('(max-width: 767px)').matches
        const target = document.getElementById(narrow ? 'participation-panel' : 'participate')
        target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
        setFocusToken((n) => n + 1)
      })
    },
    [reduced],
  )

  return (
    <>
      <a className="skip-link" href="#main">
        {t.a11y.skipToContent}
      </a>
      <Header onShareIdea={() => openPath('idea')} />
      <main id="main">
        <Hero onShareIdea={() => openPath('idea')} />
        <Participation
          selected={path}
          onSelect={setPath}
          focusToken={focusToken}
          contextTag={contextTag}
          onClearContext={() => setContextTag(null)}
        />
        <Projects onDiscuss={(context) => openPath('idea', context)} />
        <Team onJoin={() => openPath('join')} />
        <Story />
        <University />
        <FinalAction onShareIdea={() => openPath('idea')} onCollaborate={() => openPath('collab')} />
      </main>
      <Footer onHome />
    </>
  )
}
