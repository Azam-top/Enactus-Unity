import { features } from '../config/features'
import type { ThemeId } from '../shared/validation'

// Explicit, opt-in local draft: idea text and themes only. Contact details are never stored here.
const KEY = 'enactus.ideaDraft.v1'

export type IdeaDraft = {
  problem: string
  beneficiary: string
  solution: string
  themes: ThemeId[]
  savedAt: number
}

const maxAgeMs = () => features.draftMaxAgeDays * 24 * 60 * 60 * 1000

export function loadDraft(): IdeaDraft | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as IdeaDraft
    if (typeof draft.savedAt !== 'number' || Date.now() - draft.savedAt > maxAgeMs()) {
      localStorage.removeItem(KEY)
      return null
    }
    return draft
  } catch {
    return null
  }
}

export function saveDraft(draft: Omit<IdeaDraft, 'savedAt'>): number | null {
  try {
    const savedAt = Date.now()
    localStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt }))
    return savedAt + maxAgeMs()
  } catch {
    return null
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable: nothing to clear */
  }
}
