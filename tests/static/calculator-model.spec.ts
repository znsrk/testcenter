import { expect, test } from '@playwright/test'
import {
  changeUnit,
  courseBounds,
  createItem,
  failedMinimum,
  groupBounds,
  initialPeriods,
  itemBounds,
  periodBounds,
  roundUp,
  targetRequirement,
} from '../../src/components/calculator/model'
import type { Bounds, Item, Term } from '../../src/components/calculator/model'

function totals(mid = '', end = '', fin = ''): Record<Term, Bounds> {
  const periods = initialPeriods()
  return {
    mid: periodBounds({ ...periods.mid, total: mid }),
    end: periodBounds({ ...periods.end, total: end }),
    fin: periodBounds({ ...periods.fin, total: fin }),
  }
}

function scored(name: string, weight: string, score: string, maxPoints = '100'): Item {
  return { ...createItem(name, name, weight, maxPoints), score }
}

test('the supplied table reaches 100 with four 15-point assignments and a 40-point exam', () => {
  const periods = initialPeriods()
  expect(periods.mid.items.map((item) => item.weight)).toEqual(['15', '15', '15', '15', '40'])
  expect(periods.end.items.map((item) => item.name)).toEqual([
    'Assignment 5 (week 6)',
    'Assignment 6 (week 7)',
    'Assignment 7 (week 8)',
    'Assignment 8 (week 9)',
    'Endterm exam',
  ])
  const mid = groupBounds(periods.mid.items.map((item) => ({ ...item, score: item.maxPoints })))
  expect(mid).toMatchObject({ lower: 100, upper: 100, complete: true, errors: [] })
  expect(courseBounds({ mid, end: mid, fin: mid }).lower).toBe(100)
})

test('mixed points, percentages, and different score scales receive their proper weights', () => {
  const items = initialPeriods().mid.items
  items[0].score = '12' // 80% of 15 = 12
  Object.assign(items[1], { score: '50', unit: 'percent' }) // 50% of 15 = 7.5
  Object.assign(items[2], { score: '10', maxPoints: '20' }) // 50% of 15 = 7.5
  items[3].score = '15'
  items[4].score = '30'
  const mid = groupBounds(items)
  expect(mid.lower).toBe(72)
  const course = courseBounds({ ...totals('', '60', '80'), mid })
  expect(course.lower).toBeCloseTo(71.6)
  expect(course.complete).toBe(true)
})

test('nested exam section percentages are applied inside the exam weight, then the course weight', () => {
  const items = initialPeriods().mid.items.map((item) => ({ ...item, score: item.maxPoints }))
  items[4] = { ...items[4], sections: [scored('MCQ', '25', '20', '40'), scored('Writing', '75', '80')] } as Item
  const mid = groupBounds(items)
  // Exam = 50% × 25% + 80% × 75% = 72.5%; attestation = 60 + 72.5% × 40 = 89.
  expect(mid.lower).toBe(89)
  expect(courseBounds({ ...totals('', '0', '0'), mid }).lower).toBeCloseTo(26.7)
  const final = groupBounds([scored('MCQ', '40', '15', '20'), { ...scored('Open', '60', '80'), unit: 'percent' }])
  expect(final.lower).toBe(78)
})

test('partial assignments constrain the achievable range and the required remaining result', () => {
  const items = initialPeriods().mid.items.map((item, index) => ({ ...item, score: index < 4 ? '15' : '' }))
  const mid = groupBounds(items)
  expect(mid).toMatchObject({ lower: 60, upper: 100, complete: false })
  const bounds = { ...totals('', '70', '70'), mid }
  expect(courseBounds(bounds)).toMatchObject({ lower: 67, upper: 79 })
  const target = targetRequirement(bounds, 70)
  expect(target.requirements[0].total).toBeCloseTo(70)
  expect(target.requirements[0].remainingAverage).toBeCloseTo(25)
  expect(targetRequirement(bounds, 90).message).toBe('Невозможно с оставшимися оценками.')
})

test('blank scores remain pending while explicit zeros can make a minimum unreachable', () => {
  const items = initialPeriods().mid.items
  items[0].score = '0'
  const mid = groupBounds(items)
  expect(mid).toMatchObject({ lower: 0, upper: 85, complete: false, hasInput: true })
  expect(failedMinimum({ ...totals(), mid })).toBe(false)
  for (const item of items.slice(1, 4)) item.score = '0'
  items[4].sections = [scored('Known', '50', '0'), scored('Pending', '50', '')]
  const constrained = groupBounds(items)
  expect(constrained.upper).toBe(20)
  expect(failedMinimum({ ...totals(), mid: constrained })).toBe(true)
})

test('invalid scores, scales, and weight sums block calculations instead of clamping or renormalizing', () => {
  const invalidGroups = [
    [scored('A', '90', '100')],
    [scored('A', '110', '100')],
    [scored('A', '', '50')],
    [scored('A', '-10', '50'), scored('B', '110', '50')],
    [scored('A', '100', '16', '15')],
    [scored('A', '100', '-1')],
    [scored('A', '100', '0', '0')],
    [scored('A', '100', 'NaN')],
    [],
    [{ ...scored('Exam', '100', '100'), sections: [scored('Section', '80', '100')] }],
  ]
  for (const items of invalidGroups) {
    const mid = groupBounds(items)
    expect(mid.errors.length).toBeGreaterThan(0)
    expect(targetRequirement({ ...totals('', '70', '70'), mid }, 70).requirements).toEqual([])
  }
})

test('custom fractional weights and zero-weight optional items do not distort totals', () => {
  const result = groupBounds([scored('A', '12.5', '40', '50'), scored('B', '87.5', '60'), scored('Optional', '0', '')])
  expect(result).toMatchObject({ lower: 62.5, upper: 62.5, complete: true, errors: [] })
})

test('points/percentage switches preserve the earned result and decimal scores', () => {
  const item = scored('A', '15', '12', '15')
  const percent = changeUnit(item, 'percent')
  expect(percent.score).toBe('80')
  expect(itemBounds(percent).lower).toBe(itemBounds(item).lower)
  expect(changeUnit(percent, 'points').score).toBe('12')
  const fractional = scored('A', '100', '1', '3')
  expect(Number(changeUnit(changeUnit(fractional, 'percent'), 'points').score)).toBeCloseTo(1, 9)
  expect(changeUnit({ ...item, score: '' }, 'percent').score).toBe('')
})

test('targets use the existing minima and round required scores upward', () => {
  expect(courseBounds(totals('100', '25', '50')).lower).toBe(57.5)
  expect(failedMinimum(totals('100', '25', '50'))).toBe(false)
  expect(failedMinimum(totals('100', '25', '49'))).toBe(true)
  expect(targetRequirement(totals('80', '70'), 70).message).toBe('Нужно минимум 62.50 на Final.')
  const target = targetRequirement(totals('80', '69.99'), 70)
  expect(roundUp(target.requirements[0].total)).toBe('62.51')
  expect(targetRequirement(totals('100', '100', '100'), 90).message).toBe('Уже достиг с оценкой 100.0.')
})

test('target planning considers every remaining period and does not produce values over 100', () => {
  const result = targetRequirement(totals(), 90)
  expect(result.requirements).toHaveLength(3)
  for (const requirement of result.requirements) {
    expect(requirement.total).toBeLessThanOrEqual(100)
    expect(requirement.remainingAverage).toBeGreaterThanOrEqual(0)
    expect(requirement.remainingAverage).toBeLessThanOrEqual(100)
  }
  expect(targetRequirement(totals('25', '25'), 90).requirements).toEqual([])
})
