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

  it('milestones a quickSteps [2, 5]', () => {
    expect(getField('milestones').quickSteps).toEqual([2, 5])
  })
  it('awards a quickSteps [2, 5]', () => {
    expect(getField('awards').quickSteps).toEqual([2, 5])
  })

  it('les autres champs n ont pas de quickSteps', () => {
    for (const key of ['tr', 'greeneries', 'cities', 'cards']) {
      expect(getField(key).quickSteps).toBeUndefined()
    }
  })

  it('le total initial (somme des defaults) est 20 (TR seul vaut 20)', () => {
    const initTotal = fields.reduce((s, f) => s + (f.default ?? 0), 0)
    expect(initTotal).toBe(20)
  })

  it('TR a le default 20', () => {
    expect(getField('tr').default).toBe(20)
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
})
