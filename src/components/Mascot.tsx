import { useEffect, useRef, useState, type Ref } from 'react'
import { useT } from '../content/LocaleContext'
import { useMotion } from '../motion/MotionContext'
import { prefersSaveData } from '../motion/motion'
import { Icon } from './Icon'
import styles from './Mascot.module.css'

type Props = { videoRef?: Ref<HTMLVideoElement> }

/**
 * QANAT, the golden folded-paper character (the supplied video only).
 * - scrub mode (default): the video has no controls of its own; the hero scene maps scroll position to frames.
 * - manual mode (reduced motion or Save-Data): poster first, the visitor presses play.
 * The video has an opaque studio background, so it is shown as an intentional bounded panel.
 */
export function Mascot({ videoRef: externalRef }: Props) {
  const t = useT()
  const { reduced } = useMotion()
  const scrub = !reduced && !prefersSaveData()
  const frameRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)

  const setVideo = (node: HTMLVideoElement | null) => {
    innerRef.current = node
    if (typeof externalRef === 'function') externalRef(node)
    else if (externalRef) (externalRef as { current: HTMLVideoElement | null }).current = node
  }

  // Scrub mode needs the whole file, so fetch it once the page is idle — text and poster render first.
  useEffect(() => {
    const video = innerRef.current
    if (!scrub || !video) return
    const load = () => {
      video.preload = 'auto'
      video.load()
    }
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(load, { timeout: 2500 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(load, 1200)
    return () => clearTimeout(id)
  }, [scrub])

  // Manual mode: pause when offscreen or the tab is hidden.
  useEffect(() => {
    const frame = frameRef.current
    const video = innerRef.current
    if (scrub || !frame || !video) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio < 0.1 && !video.paused) video.pause()
    }, { threshold: [0, 0.1] })
    io.observe(frame)
    const onVisibility = () => {
      if (document.hidden && !video.paused) video.pause()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [scrub])

  const toggle = () => {
    const video = innerRef.current
    if (!video) return
    if (ended) {
      video.currentTime = 0
      void video.play().catch(() => undefined)
    } else if (video.paused) {
      void video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }

  const label = ended ? t.hero.media.replay : playing ? t.hero.media.pause : t.hero.media.play

  return (
    <div className={styles.frame} ref={frameRef} data-mascot-mode={scrub ? 'scrub' : 'manual'}>
      <div className={styles.media} aria-hidden="true">
        <video
          ref={setVideo}
          className={styles.video}
          poster="/media/qanat-poster.webp"
          width={720}
          height={720}
          muted
          playsInline
          preload="none"
          disablePictureInPicture
          tabIndex={-1}
          onPlaying={() => {
            setPlaying(true)
            setEnded(false)
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false)
            setEnded(true)
          }}
        >
          <source
            src="/media/qanat-hero.mp4"
            type="video/mp4"
            onError={() => {
              // Decoding or network failure: keep the poster and let the control offer a retry.
              setPlaying(false)
              setEnded(false)
            }}
          />
        </video>
      </div>
      {!scrub && (
        <button type="button" className={styles.control} onClick={toggle} aria-label={label} title={label}>
          <Icon name={ended ? 'replay' : playing ? 'pause' : 'play'} size={18} />
        </button>
      )}
    </div>
  )
}
