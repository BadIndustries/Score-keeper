import { describe, it, expect } from 'vitest'
import { GAMES, DEFAULT_LIMITS } from './games.config.js'

describe('GAMES -- Terraforming Mars', () => {
  const TM = GAMES.terraforming
  const fields = TM.scoreFields

  function getField(key) {
    return fields.find(f => f.key === key)
  }

  it('le champ milestones a le label Objectif', () => {
    expect(getField('milestones').label).toBe('Objectif')
  })
  it('le champ milestones a l emoji 🎯', () => {
    expect(getField('milestones').emoji).toBe('🎯')
  })
  it('le champ awards a le label Recompense', () => {
    expect(getField('awards').label).toBe('Récompense')
  })
  it('le champ awards a l emoji 🏆', () => {
    expect(getField('awards').emoji).toBe('🏆')
  })

  it('milestones a quickSteps [5] (pas de +2 impossible selon les regles)', () => {
    expect(getField('milestones').quickSteps).toEqual([5])
  })
  it('awards a quickSteps [2, 5] (5 pts 1er, 2 pts 2e)', () => {
    expect(getField('awards').quickSteps).toEqual([2, 5])
  })

  it('les autres champs n ont pas de quickSteps', () => {
    for (const key of ['tr', 'greeneries', 'cities', 'cards']) {
      expect(getField(key).quickSteps).toBeUndefined()
    }
  })

  it('le total initial (somme des defaults) est 14 (NT de depart selon les regles)', () => {
    const initTotal = fields.reduce((s, f) => s + (f.default ?? 0), 0)
    expect(initTotal).toBe(14)
  })

  it('TR a le default 14 (NT de depart officiel)', () => {
    expect(getField('tr').default).toBe(14)
  })

  it('milestones et awards ont le default 0', () => {
    expect(getField('milestones').default).toBe(0)
    expect(getField('awards').default).toBe(0)
  })

  it('Objectif (milestones) apparait avant Recompense (awards) dans la liste', () => {
    const miIdx = fields.findIndex(f => f.key === 'milestones')
    const awIdx = fields.findIndex(f => f.key === 'awards')
    expect(miIdx).toBeLessThan(awIdx)
  })
})

describe('GAMES -- pas de Rebirth', () => {
  it('rebirth n existe pas dans GAMES', () => {
    expect(GAMES.rebirth).toBeUndefined()
  })
  it('DEFAULT_LIMITS ne contient pas rebirth', () => {
    expect(DEFAULT_LIMITS.rebirth).toBeUndefined()
  })
})

describe('GAMES -- winMode correct pour chaque jeu', () => {
  it('odin: lowest', () => { expect(GAMES.odin.winMode).toBe('lowest') })
  it('flip7: highest', () => { expect(GAMES.flip7.winMode).toBe('highest') })
  it('skyjo: lowest', () => { expect(GAMES.skyjo.winMode).toBe('lowest') })
  it('rdn: lowest', () => { expect(GAMES.rdn.winMode).toBe('lowest') })
  it('qwirkle: highest', () => { expect(GAMES.qwirkle.winMode).toBe('highest') })
  it('terraforming: highest', () => { expect(GAMES.terraforming.winMode).toBe('highest') })
  it('harmonies: highest', () => { expect(GAMES.harmonies.winMode).toBe('highest') })
})

describe('GAMES -- Harmonies', () => {
  const H = GAMES.harmonies
  const fields = H.scoreFields

  function getField(key) {
    return fields.find(f => f.key === key)
  }

  it('harmonies est defini dans GAMES', () => {
    expect(H).toBeDefined()
  })
  it('scoreType est sheet', () => {
    expect(H.scoreType).toBe('sheet')
  })
  it('endOnDemand est true', () => {
    expect(H.endOnDemand).toBe(true)
  })
  it('winMode est highest', () => {
    expect(H.winMode).toBe('highest')
  })
  it('contient exactement 6 champs', () => {
    expect(fields).toHaveLength(6)
  })
  it('les 6 champs sont : trees, mountains, river, fields, buildings, animals', () => {
    expect(fields.map(f => f.key)).toEqual(['trees', 'mountains', 'river', 'fields', 'buildings', 'animals'])
  })
  it('tous les champs ont default 0', () => {
    for (const f of fields) expect(f.default).toBe(0)
  })
  it('trees a quickSteps [1, 3, 5]', () => {
    expect(getField('trees').quickSteps).toEqual([1, 3, 5])
  })
  it('mountains a quickSteps [1, 3, 7]', () => {
    expect(getField('mountains').quickSteps).toEqual([1, 3, 7])
  })
  it('fields (champs) a quickSteps [5]', () => {
    expect(getField('fields').quickSteps).toEqual([5])
  })
  it('buildings a quickSteps [5]', () => {
    expect(getField('buildings').quickSteps).toEqual([5])
  })
  it('river et animals n ont pas de quickSteps (saisie libre)', () => {
    expect(getField('river').quickSteps).toBeUndefined()
    expect(getField('animals').quickSteps).toBeUndefined()
  })
  it('chaque champ a un hint', () => {
    for (const f of fields) expect(typeof f.hint).toBe('string')
  })
  it('le total initial est 0 (tous les defaults sont 0)', () => {
    const initTotal = fields.reduce((s, f) => s + (f.default ?? 0), 0)
    expect(initTotal).toBe(0)
  })
  it('pas d extensions (jeu de base sans modules)', () => {
    expect(H.extensions).toBeUndefined()
  })
  it('DEFAULT_LIMITS contient harmonies', () => {
    expect(DEFAULT_LIMITS.harmonies).toBe(999)
  })
})
