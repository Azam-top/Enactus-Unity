import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useReducedMotion } from '../hooks/useMediaQuery'

// "Меньше анимации": a persisted visitor choice layered on top of — never overriding — the OS preference.
const STORAGE_KEY = 'enactus.reduceMotion'

type MotionValue = {
  /** True when motion must be reduced, from the OS or the visitor's own switch. */
  reduced: boolean
  systemReduced: boolean
  userReduced: boolean
  toggleUserReduced: () => void
}

const MotionContext = createContext<MotionValue>({
  reduced: false,
  systemReduced: false,
  userReduced: false,
  toggleUserReduced: () => undefined,
})

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const systemReduced = useReducedMotion()
  const [userReduced, setUserReduced] = useState(readStored)

  const toggleUserReduced = useCallback(() => {
    setUserReduced((current) => {
      const next = !current
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* storage unavailable: the choice lasts for this visit only */
      }
      return next
    })
  }, [])

  const reduced = systemReduced || userReduced
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full'
  }, [reduced])

  const value = useMemo(
    () => ({ reduced, systemReduced, userReduced, toggleUserReduced }),
    [reduced, systemReduced, userReduced, toggleUserReduced],
  )
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}

export const useMotion = (): MotionValue => useContext(MotionContext)
