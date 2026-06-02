import { describe, it, expect } from 'vitest'
import { computeTourScores, isGameOver, getWinnerIndex, makeActiveGame, recordPastGame } from './gameLogic.js'

describe('computeTourScores', () => {
  describe('Odin / Roi des Nains / Skyjo (sans double)', () => {
    it('retourne les scores tels quels', () => {
      expect(computeTourScores('odin', [3, 5, 2])).toEqual([3, 5, 2])
    })
    it('retourne les scores negatifs tels quels', () => {
      expect(computeTourScores('skyjo', [-3, 5], [], [false, false])).toEqual([-3, 5])
    })
  })

  describe('Flip7 -- +15 pts si flip actif', () => {
    it('ajoute 15 pts aux joueurs avec flip7 actif', () => {
      expect(computeTourScores('flip7', [4, 2, 0], [true, false, true])).toEqual([19, 2, 15])
    })
    it('sans flip7, les scores sont inchanges', () => {
      expect(computeTourScores('flip7', [4, 2], [false, false])).toEqual([4, 2])
    })
    it('score 0 + flip7 = 15', () => {
      expect(computeTourScores('flip7', [0], [true])).toEqual([15])
    })
  })

  describe('Flip7 -- x2 si flip7dbl actif', () => {
    it('double le score total incluant le bonus flip7', () => {
      expect(computeTourScores('flip7', [4, 2], [true, false], [], [true, false])).toEqual([38, 2])
    })
    it('double le score de base sans bonus flip7', () => {
      expect(computeTourScores('flip7', [5, 0], [false, false], [], [true, false])).toEqual([10, 0])
    })
    it('x2 avec score 0 et flip7 = 30', () => {
      expect(computeTourScores('flip7', [0], [true], [], [true])).toEqual([30])
    })
    it('flip7=false dbl=true : base * 2', () => {
      expect(computeTourScores('flip7', [4], [false], [], [true])).toEqual([8])
    })
    it('flip7=true dbl=false : base + 15', () => {
      expect(computeTourScores('flip7', [4], [true], [], [false])).toEqual([19])
    })
    it('flip7=false dbl=false : score inchange', () => {
      expect(computeTourScores('flip7', [4], [false], [], [false])).toEqual([4])
    })
  })

  describe('Skyjo -- double si actif et score != 0', () => {
    it('double les scores positifs', () => {
      expect(computeTourScores('skyjo', [5, 3], [], [true, true])).toEqual([10, 6])
    })
    it('double les scores negatifs', () => {
      expect(computeTourScores('skyjo', [-5, 3], [], [true, true])).toEqual([-10, 6])
    })
    it('ne double pas zero', () => {
      expect(computeTourScores('skyjo', [0, 3], [], [true, true])).toEqual([0, 6])
    })
    it('double non actif : score negatif inchange', () => {
      expect(computeTourScores('skyjo', [-5, 3], [], [false, false])).toEqual([-5, 3])
    })
  })
})

describe('isGameOver', () => {
  it('true quand un joueur atteint la limite exacte', () => {
    expect(isGameOver([10, 15, 8], 15)).toBe(true)
  })
  it('true quand un joueur depasse la limite', () => {
    expect(isGameOver([10, 18, 8], 15)).toBe(true)
  })
  it('false si personne na atteint la limite', () => {
    expect(isGameOver([10, 14, 8], 15)).toBe(false)
  })
  it('fonctionne avec un seul joueur', () => {
    expect(isGameOver([15], 15)).toBe(true)
    expect(isGameOver([14], 15)).toBe(false)
  })
  it('retourne false avec un tableau vide', () => {
    expect(isGameOver([], 15)).toBe(false)
  })
  it('gere Infinity', () => {
    expect(isGameOver([Infinity, 10], 15)).toBe(true)
  })
})

describe('getWinnerIndex', () => {
  it('lowest: gagnant = moins de points (Odin, Skyjo, RdN)', () => {
    expect(getWinnerIndex([12, 5, 18], 'lowest')).toBe(1)
  })
  it('highest: gagnant = plus de points (Flip7)', () => {
    expect(getWinnerIndex([12, 5, 18], 'highest')).toBe(2)
  })
  it('lowest: en cas d egalite, retourne le premier', () => {
    expect(getWinnerIndex([5, 5, 10], 'lowest')).toBe(0)
  })
  it('retourne -1 avec un tableau vide', () => {
    expect(getWinnerIndex([], 'lowest')).toBe(-1)
  })
  it('highest: en cas d egalite, retourne le premier', () => {
    expect(getWinnerIndex([10, 10, 5], 'highest')).toBe(0)
  })
})

describe('makeActiveGame', () => {
  it('initialise odin avec les bonnes valeurs par defaut', () => {
    const game = makeActiveGame('odin', 'g1', ['Alice', 'Bob'], 15)
    expect(game.tour).toBe(1)
    expect(game.manche).toBe(1)
    expect(game.totals).toEqual([0, 0])
    expect(game.current).toEqual([0, 0])
    expect(game.players).toEqual(['Alice', 'Bob'])
    expect(game.limit).toBe(15)
    expect(game.groupId).toBe('g1')
    expect(game.history).toEqual([])
    expect(typeof game.startedAt).toBe('string')
  })
  it('initialise flip7 avec les champs flip7 et flip7dbl', () => {
    const game = makeActiveGame('flip7', null, ['Alice', 'Bob', 'Carol'], 200)
    expect(game.flip7).toEqual([false, false, false])
    expect(game.flip7dbl).toEqual([false, false, false])
    expect(game.doubled).toBeUndefined()
  })
  it('initialise skyjo avec le champ doubled', () => {
    const game = makeActiveGame('skyjo', 'g1', ['Alice', 'Bob'], 100)
    expect(game.doubled).toEqual([false, false])
    expect(game.flip7).toBeUndefined()
  })
  it('ne partage pas le tableau players (copie profonde)', () => {
    const players = ['Alice', 'Bob']
    const game = makeActiveGame('odin', null, players, 15)
    players.push('Carol')
    expect(game.players).toHaveLength(2)
  })
})

describe('recordPastGame', () => {
  function makeAg(players, totals, opts = {}) {
    return {
      players,
      totals,
      ...('tour' in opts ? { tour: opts.tour } : { tour: 3 }),
      ...('manche' in opts ? { manche: opts.manche } : {}),
      startedAt: '2026-01-01T00:00:00.000Z',
    }
  }

  it('cree pastGames si absent et enregistre la partie', () => {
    const grp = {}
    const ag = makeAg(['Alice', 'Bob'], [120, 80])
    recordPastGame(grp, 'flip7', ag, 'highest')
    expect(grp.pastGames).toHaveLength(1)
    expect(grp.pastGames[0].gameId).toBe('flip7')
    expect(grp.pastGames[0].winner).toBe('Alice')
    expect(grp.pastGames[0].rounds).toBe(3)
  })

  it('winMode highest: gagnant = score le plus eleve', () => {
    const grp = { pastGames: [] }
    recordPastGame(grp, 'flip7', makeAg(['Alice', 'Bob', 'Carol'], [80, 200, 150]), 'highest')
    expect(grp.pastGames[0].winner).toBe('Bob')
  })

  it('winMode lowest: gagnant = score le plus bas', () => {
    const grp = { pastGames: [] }
    recordPastGame(grp, 'odin', makeAg(['Alice', 'Bob'], [12, 5]), 'lowest')
    expect(grp.pastGames[0].winner).toBe('Bob')
  })

  it('egalite: winner contient les deux noms separes par une virgule', () => {
    const grp = { pastGames: [] }
    recordPastGame(grp, 'odin', makeAg(['Alice', 'Bob', 'Carol'], [5, 5, 10]), 'lowest')
    expect(grp.pastGames[0].winners).toEqual(['Alice', 'Bob'])
    expect(grp.pastGames[0].winner).toBe('Alice, Bob')
  })

  it('enregistre les scores de chaque joueur', () => {
    const grp = { pastGames: [] }
    recordPastGame(grp, 'skyjo', makeAg(['Alice', 'Bob'], [30, 90]), 'lowest')
    expect(grp.pastGames[0].scores).toEqual([
      { name: 'Alice', score: 30 },
      { name: 'Bob', score: 90 },
    ])
  })

  it('ajoute en tete (unshift): la partie la plus recente est en premier', () => {
    const grp = { pastGames: [{ gameId: 'old' }] }
    recordPastGame(grp, 'odin', makeAg(['Alice', 'Bob'], [5, 10]), 'lowest')
    expect(grp.pastGames[0].gameId).toBe('odin')
    expect(grp.pastGames[1].gameId).toBe('old')
  })

  it('limite a 20 parties', () => {
    const grp = { pastGames: Array.from({ length: 20 }, (_, i) => ({ gameId: 'x', i })) }
    recordPastGame(grp, 'flip7', makeAg(['Alice', 'Bob'], [200, 100]), 'highest')
    expect(grp.pastGames).toHaveLength(20)
    expect(grp.pastGames[0].gameId).toBe('flip7')
  })

  it('utilise manche si tour est undefined', () => {
    const grp = { pastGames: [] }
    const ag = makeAg(['Alice', 'Bob'], [10, 5], { tour: undefined, manche: 7 })
    recordPastGame(grp, 'odin', ag, 'lowest')
    expect(grp.pastGames[0].rounds).toBe(7)
  })

  it('retourne le groupe modifie', () => {
    const grp = { pastGames: [] }
    const result = recordPastGame(grp, 'odin', makeAg(['Alice'], [5]), 'lowest')
    expect(result).toBe(grp)
  })
})
