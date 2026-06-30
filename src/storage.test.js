import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadGroups, loadActiveGame, saveGroups, saveActiveGame } from './storage.js'
import { KEY_GROUPS, GAMES } from './games.config.js'

describe('storage — robustesse', () => {
  beforeEach(() => {
    const store = {}
    vi.stubGlobal('localStorage', {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v) },
      removeItem: k => { delete store[k] },
    })
  })

  it('loadGroups : JSON corrompu → groupes par défaut', () => {
    localStorage.setItem(KEY_GROUPS, '{pas du json')
    const g = loadGroups()
    expect(Array.isArray(g)).toBe(true)
    expect(g[0].name).toBe('Weekend')
  })

  it('loadGroups : payload non-tableau → défauts', () => {
    localStorage.setItem(KEY_GROUPS, JSON.stringify({ foo: 1 }))
    expect(loadGroups()[0].players.length).toBeGreaterThan(0)
  })

  it('loadGroups : tableau valide est retourné tel quel', () => {
    const groups = [{ id: 'x', name: 'Test', players: ['A', 'B'], pastGames: [] }]
    localStorage.setItem(KEY_GROUPS, JSON.stringify(groups))
    expect(loadGroups()).toEqual(groups)
  })

  it('loadActiveGame : objet sans activeGame → null', () => {
    localStorage.setItem(GAMES.odin.key, JSON.stringify({ autre: 1 }))
    expect(loadActiveGame('odin')).toBeNull()
  })

  it('loadActiveGame : aucune donnée → null', () => {
    expect(loadActiveGame('odin')).toBeNull()
  })

  it('loadActiveGame : Skyjo legacy sans doubled est normalisé (pas de crash au reload)', () => {
    saveActiveGame('skyjo', { players: ['A', 'B'], totals: [10, 20], current: [0, 0], history: [] })
    const ag = loadActiveGame('skyjo')
    expect(ag.doubled).toEqual([false, false])
  })

  it('saveGroups : laisse remonter l’exception quota', () => {
    localStorage.setItem = () => { throw new DOMException('quota', 'QuotaExceededError') }
    expect(() => saveGroups([{ id: 'x' }])).toThrow()
  })
})
