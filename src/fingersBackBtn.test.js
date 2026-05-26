import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Regression #46 : bouton Retour non cliquable dans l'ecran Doigts.
 *
 * Cause : document touchstart + touchend appelaient e.preventDefault()
 * avant de tester la cible, bloquant toute synthese de clic sur le bouton.
 *
 * Fix :
 *   1. Guard [data-back] dans onStart -- early return sans preventDefault.
 *   2. onTouchEnd sur le bouton avec stopPropagation pour court-circuiter
 *      le listener document et naviguer directement.
 */

function makeOnStart(onFingersTouch) {
  return function onStart(e) {
    if (e.target.closest && e.target.closest('[data-back]')) return
    e.preventDefault()
    onFingersTouch?.(e)
  }
}

function makeBackBtnTouchEnd(navigate) {
  return function onTouchEnd(e) {
    e.stopPropagation()
    e.preventDefault()
    navigate()
  }
}

function mockEl({ hasDataBack = false } = {}) {
  return {
    closest: (sel) =>
      sel === '[data-back]' && hasDataBack ? { dataset: { back: 'true' } } : null,
  }
}

function mockEvent(target) {
  return { target, preventDefault: vi.fn(), stopPropagation: vi.fn(), changedTouches: [] }
}

describe('Fingers -- bouton Retour (regression #46)', () => {

  describe('guard onStart : ignore les touches sur [data-back]', () => {
    it('ne pas appeler preventDefault si la cible porte data-back', () => {
      const onFingersTouch = vi.fn()
      const onStart = makeOnStart(onFingersTouch)
      const e = mockEvent(mockEl({ hasDataBack: true }))

      onStart(e)

      expect(e.preventDefault).not.toHaveBeenCalled()
      expect(onFingersTouch).not.toHaveBeenCalled()
    })

    it('appeler preventDefault si la cible ne porte pas data-back', () => {
      const onFingersTouch = vi.fn()
      const onStart = makeOnStart(onFingersTouch)
      const e = mockEvent(mockEl({ hasDataBack: false }))

      onStart(e)

      expect(e.preventDefault).toHaveBeenCalledOnce()
      expect(onFingersTouch).toHaveBeenCalledWith(e)
    })

    it('proteger un element enfant dont le parent a data-back', () => {
      const onStart = makeOnStart(vi.fn())
      const childEl = {
        closest: (sel) =>
          sel === '[data-back]' ? { dataset: { back: 'true' } } : null,
      }
      const e = mockEvent(childEl)

      onStart(e)

      expect(e.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('onTouchEnd du bouton Retour', () => {
    it('appelle la fonction de navigation', () => {
      const navigate = vi.fn()
      const e = mockEvent(mockEl())

      makeBackBtnTouchEnd(navigate)(e)

      expect(navigate).toHaveBeenCalledOnce()
    })

    it('appelle stopPropagation pour bloquer le listener document', () => {
      const e = mockEvent(mockEl())

      makeBackBtnTouchEnd(vi.fn())(e)

      expect(e.stopPropagation).toHaveBeenCalledOnce()
    })

    it('appelle preventDefault pour eviter la double navigation', () => {
      const e = mockEvent(mockEl())

      makeBackBtnTouchEnd(vi.fn())(e)

      expect(e.preventDefault).toHaveBeenCalledOnce()
    })

    it('appelle stopPropagation avant de naviguer', () => {
      const callOrder = []
      const e = {
        stopPropagation: vi.fn(() => callOrder.push('stopPropagation')),
        preventDefault: vi.fn(() => callOrder.push('preventDefault')),
        changedTouches: [],
      }
      const navigate = vi.fn(() => callOrder.push('navigate'))

      makeBackBtnTouchEnd(navigate)(e)

      expect(callOrder[0]).toBe('stopPropagation')
      expect(callOrder).toContain('navigate')
    })
  })

  describe('attribut data-back : ciblage via closest()', () => {
    it('closest retourne le bon element si data-back est present', () => {
      const el = mockEl({ hasDataBack: true })
      expect(el.closest('[data-back]')).not.toBeNull()
    })

    it('closest retourne null sans data-back', () => {
      const el = mockEl({ hasDataBack: false })
      expect(el.closest('[data-back]')).toBeNull()
    })
  })
})

// ── Helpers modélisant la logique multi-doigts de WhoStartsApp ──────────────

function makeFingerLogic(MIN_T = 2, DEBOUNCE_MS = 300) {
  const touchMap = new Map()
  const freeSlots = [0, 1, 2, 3, 4]
  let locked = false
  let state = 'idle'
  let debounceRef = null
  let countdownStarted = false

  const startCD = () => {
    if (state === 'countdown') return
    locked = true
    state = 'countdown'
    countdownStarted = true
  }

  const cancelCD = () => {
    if (debounceRef !== null) { clearTimeout(debounceRef); debounceRef = null }
    if (state === 'countdown') { state = 'waiting'; locked = false }
  }

  const onStart = (changedTouches) => {
    if (locked) return
    for (const t of changedTouches) {
      if (touchMap.size >= 5) break
      const idx = freeSlots.shift()
      if (idx === undefined) break
      touchMap.set(t.identifier, { idx })
    }
    state = 'waiting'
    const n = touchMap.size
    if (debounceRef !== null) clearTimeout(debounceRef)
    if (n >= MIN_T) {
      debounceRef = setTimeout(() => { debounceRef = null; startCD() }, DEBOUNCE_MS)
    }
  }

  const onEnd = (changedTouches) => {
    if (state === 'result') return
    for (const t of changedTouches) {
      const d = touchMap.get(t.identifier)
      if (d) { freeSlots.push(d.idx); freeSlots.sort((a, b) => a - b); touchMap.delete(t.identifier) }
    }
    const n = touchMap.size
    if (n < MIN_T) { cancelCD(); state = n > 0 ? 'waiting' : 'idle' }
  }

  return {
    onStart, onEnd, cancelCD,
    get size() { return touchMap.size },
    get state() { return state },
    get locked() { return locked },
    get countdownStarted() { return countdownStarted },
  }
}

function touch(id) { return { identifier: id } }

describe('Fingers -- multi-doigts (3, 4, 5)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('3 doigts dans le même événement : tous enregistrés', () => {
    const logic = makeFingerLogic()
    logic.onStart([touch(1), touch(2), touch(3)])
    expect(logic.size).toBe(3)
  })

  it('4 doigts dans le même événement : tous enregistrés', () => {
    const logic = makeFingerLogic()
    logic.onStart([touch(1), touch(2), touch(3), touch(4)])
    expect(logic.size).toBe(4)
  })

  it('5 doigts dans le même événement : tous enregistrés', () => {
    const logic = makeFingerLogic()
    logic.onStart([touch(1), touch(2), touch(3), touch(4), touch(5)])
    expect(logic.size).toBe(5)
  })

  it('3 doigts en 2 événements rapides : le 3e arrive dans la fenêtre debounce', () => {
    const logic = makeFingerLogic()
    logic.onStart([touch(1), touch(2)])
    expect(logic.locked).toBe(false) // debounce en cours, pas encore verrouillé
    vi.advanceTimersByTime(100)
    logic.onStart([touch(3)])
    expect(logic.size).toBe(3)
    expect(logic.locked).toBe(false) // debounce réinitialisé
    vi.advanceTimersByTime(300)
    expect(logic.locked).toBe(true)
    expect(logic.countdownStarted).toBe(true)
  })

  it('5 doigts en 3 événements rapides : tous enregistrés avant le countdown', () => {
    const logic = makeFingerLogic()
    logic.onStart([touch(1), touch(2)])
    vi.advanceTimersByTime(50)
    logic.onStart([touch(3)])
    vi.advanceTimersByTime(50)
    logic.onStart([touch(4), touch(5)])
    expect(logic.size).toBe(5)
    expect(logic.locked).toBe(false)
    vi.advanceTimersByTime(300)
    expect(logic.locked).toBe(true)
    expect(logic.countdownStarted).toBe(true)
  })

  it('le countdown ne démarre pas si un doigt est levé avant la fin du debounce', () => {
    const logic = makeFingerLogic()
    logic.onStart([touch(1), touch(2)])
    vi.advanceTimersByTime(100)
    logic.onEnd([touch(2)])       // 1 doigt restant → cancelCD annule le debounce
    expect(logic.size).toBe(1)
    vi.advanceTimersByTime(300)  // le debounce aurait dû tirer, mais il est annulé
    expect(logic.locked).toBe(false)
    expect(logic.countdownStarted).toBe(false)
  })

  it('le countdown démarre normalement avec 3 doigts après le délai', () => {
    const logic = makeFingerLogic()
    logic.onStart([touch(1), touch(2), touch(3)])
    expect(logic.countdownStarted).toBe(false)
    vi.advanceTimersByTime(300)
    expect(logic.countdownStarted).toBe(true)
    expect(logic.state).toBe('countdown')
  })

  it('6 touches ignorées au-delà de la limite de 5', () => {
    const logic = makeFingerLogic()
    logic.onStart([touch(1), touch(2), touch(3), touch(4), touch(5), touch(6)])
    expect(logic.size).toBe(5)
  })
})
