import { describe, it, expect, vi } from 'vitest'

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
