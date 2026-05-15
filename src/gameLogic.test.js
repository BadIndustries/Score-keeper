import { describe, it, expect } from 'vitest'
import { computeTourScores, isGameOver, getWinnerIndex } from './gameLogic.js'

describe('computeTourScores', () => {
  describe('Odin / Roi des Nains / Skyjo (sans double)', () => {
    it('retourne les scores tels quels', () => {
      expect(computeTourScores('odin', [3, 5, 2])).toEqual([3, 5, 2])
    })
    it('retourne les scores négatifs tels quels', () => {
      expect(computeTourScores('skyjo', [-3, 5], [], [false, false])).toEqual([-3, 5])
    })
  })

  describe('Flip7 — +15 pts si flip actif', () => {
    it('ajoute 15 pts aux joueurs avec flip7 actif', () => {
      expect(computeTourScores('flip7', [4, 2, 0], [true, false, true])).toEqual([19, 2, 15])
    })
    it('sans flip7, les scores sont inchangés', () => {
      expect(computeTourScores('flip7', [4, 2], [false, false])).toEqual([4, 2])
    })
    it('score 0 + flip7 = 15', () => {
      expect(computeTourScores('flip7', [0], [true])).toEqual([15])
    })
  })

  describe('Skyjo — double si actif et score > 0', () => {
    it('double les scores positifs', () => {
      expect(computeTourScores('skyjo', [5, 3], [], [true, true])).toEqual([10, 6])
    })
    it('ne double pas les scores négatifs', () => {
      expect(computeTourScores('skyjo', [-5, 3], [], [true, true])).toEqual([-5, 6])
    })
    it('ne double pas zéro', () => {
      expect(computeTourScores('skyjo', [0, 3], [], [true, true])).toEqual([0, 6])
    })
  })
})

describe('isGameOver', () => {
  it('true quand un joueur atteint la limite exacte', () => {
    expect(isGameOver([10, 15, 8], 15)).toBe(true)
  })
  it('true quand un joueur dépasse la limite', () => {
    expect(isGameOver([10, 18, 8], 15)).toBe(true)
  })
  it('false si personne n\'a atteint la limite', () => {
    expect(isGameOver([10, 14, 8], 15)).toBe(false)
  })
  it('fonctionne avec un seul joueur', () => {
    expect(isGameOver([15], 15)).toBe(true)
    expect(isGameOver([14], 15)).toBe(false)
  })
})

describe('getWinnerIndex', () => {
  it('lowest: gagnant = moins de points (Odin, Skyjo, RdN)', () => {
    expect(getWinnerIndex([12, 5, 18], 'lowest')).toBe(1)
  })
  it('highest: gagnant = plus de points (Flip7)', () => {
    expect(getWinnerIndex([12, 5, 18], 'highest')).toBe(2)
  })
  it('lowest: en cas d\'égalité, retourne le premier', () => {
    expect(getWinnerIndex([5, 5, 10], 'lowest')).toBe(0)
  })
})
