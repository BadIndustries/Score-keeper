import { describe, it, expect, vi } from 'vitest'

/**
 * Régression #46 : bouton Retour non cliquable dans l'écran Doigts.
 *
 * Cause : document touchstart + touchend appelaient e.preventDefault()
 * AVANT de tester la cible, bloquant toute synthèse de clic sur le bouton.
 *
 * Fix :
 *   1. Guard [data-back] dans onStart — early return sans preventDefault.
 *   2. onTouchEnd sur le bouton avec stopPropagation pour court-circuiter
 *      le listener document et naviguer directement.
 */

// ── Réplique du guard onStart (App.jsx) ──────────────────────────────
function makeOnStart(onFingersTouch) {
  return function onStart(e) {
    if (e.target.closest && e.target.closest('[data-back]')) return
    e.preventDefault()
    onFingersTouch?.(e)
  }
}

// ── Réplique du handler onTouchEnd du bouton Retour (App.jsx) ─────────
function makeBackBtnTouchEnd(navigate) {
  return function onTouchEnd(e) {
    e.stopPropagation()
    e.preventDefault()
    navigate()
  }
}

// ── Helper : faux élément avec .closest() ────────────────────────────
function mockEl({ hasDataBack = false } = {}) {
  return {
    closest: (sel) =>
      sel === '[data-back]' && hasDataBack ? { dataset: { back: 'true' } } : null,
  }
}

// ── Helper : faux event ──────────────────────────────────────────────
function mockEvent(target) {
  return { target, preventDefault: vi.fn(), stopPropagation: vi.fn(), changedTouches: [] }
}

// ────────────────────────────────────────────────────────────────────
describe('Fingers — bouton Retour (régression #46)', () => {

  describe('guard onStart : ignore les touches sur [data-back]', () => {
    it('ne PAS appeler preventDefault si la cible porte data-back', () => {
      const onFingersTouch = vi.fn()
      const onStart = makeOnStart(onFingersTouch)
      const e = mockEvent(mockEl({ hasDataBack: true }))

      onStart(e)

      expect(e.preventDefault).not.toHaveBeenCalled()
      expect(onFingersTouch).not.toHaveBeenCalled()
    })

    it('appeler preventDefault si la cible ne porte PAS data-back', () => {
      const onFingersTouch = vi.fn()
      const onStart = makeOnStart(onFingersTouch)
      const e = mockEvent(mockEl({ hasDataBack: false }))

      onStart(e)

      expect(e.preventDefault).toHaveBeenCalledOnce()
      expect(onFingersTouch).toHaveBeenCalledWith(e)
    })

    it('traiter un enfant dont l'ancêtre a data-back comme protégé', () => {
      const onStart = makeOnStart(vi.fn())
      // Texte "← Retour" : target = span enfant, ancêtre = div[data-back]
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

    it('appelle preventDefault pour éviter la double navigation via click synthétisé', () => {
      const e = mockEvent(mockEl())

      makeBackBtnTouchEnd(vi.fn())(e)

      expect(e.preventDefault).toHaveBeenCalledOnce()
    })

    it('appelle stopPropagation AVANT de naviguer', () => {
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
    it('closest("[data-back]") retourne le bon élément si data-back est présent', () => {
      const el = mockEl({ hasDataBack: true })
      expect(el.closest('[data-back]')).not.toBeNull()
    })

    it('closest("[data-back]") retourne null sans l'attribut', () => {
      const el = mockEl({ hasDataBack: false })
      expect(el.closest('[data-back]')).toBeNull()
    })
  })
})
