import { useEffect, useState } from 'react'

/**
 * True once the page has finished loading and the browser has had an idle moment. Decorative extras (the border beam,
 * the text reveal and the animation library behind them) mount only then, so they never compete with the first paint.
 */
export function useAfterIdle(timeoutMs = 2500): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let handle = 0
    let cancelIdle: (() => void) | undefined
    const run = () => setReady(true)
    const start = () => {
      if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(run, { timeout: timeoutMs })
        cancelIdle = () => window.cancelIdleCallback(id)
      } else {
        handle = window.setTimeout(run, 1500)
      }
    }
    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start, { once: true })
    return () => {
      window.removeEventListener('load', start)
      window.clearTimeout(handle)
      cancelIdle?.()
    }
  }, [timeoutMs])
  return ready
}
