export const PERIODS = {
  mid: { label: 'Midterm', title: '1-я аттестация', weight: 0.3, minimum: 25, placeholder: 'e.g., 72' },
  end: { label: 'Endterm', title: '2-я аттестация', weight: 0.3, minimum: 25, placeholder: 'e.g., 65' },
  fin: { label: 'Final', title: 'Финальный экзамен', weight: 0.4, minimum: 50, placeholder: 'e.g., 80' },
} as const

export type Term = keyof typeof PERIODS
export const TERMS: Term[] = ['mid', 'end', 'fin']
export type Unit = 'points' | 'percent'
export type Item = {
  id: string
  name: string
  weight: string
  score: string
  maxPoints: string
  unit: Unit
  sections?: Item[]
}
export type Period = { mode: 'total' | 'items'; total: string; items: Item[] }
export type Bounds = { lower: number; upper: number; complete: boolean; hasInput: boolean; errors: string[] }
const EPSILON = 1e-8

export function createItem(id: string, name: string, weight = '', maxPoints = '100'): Item {
  return { id, name, weight, maxPoints, score: '', unit: 'points' }
}

export function initialPeriods(): Record<Term, Period> {
  const attestation = (term: 'mid' | 'end'): Period => ({
    mode: 'total',
    total: '',
    items: [
      ...Array.from({ length: 4 }, (_, index) => {
        const number = index + (term === 'mid' ? 1 : 5)
        const week = number + (term === 'mid' ? 0 : 1)
        return createItem(`${term}-${number}`, `Assignment ${number} (week ${week})`, '15', '15')
      }),
      createItem(`${term}-exam`, `${PERIODS[term].label} exam`, '40', '40'),
    ],
  })
  return {
    mid: attestation('mid'),
    end: attestation('end'),
    fin: { mode: 'total', total: '', items: [createItem('fin-exam', 'MCQ + открытые вопросы', '100')] },
  }
}

function number(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function scoreBounds(score: string, maximum: number | null): Bounds {
  const errors: string[] = []
  if (maximum === null || maximum <= 0) errors.push('Максимальный балл должен быть больше 0.')
  const value = number(score)
  const hasInput = score.trim() !== ''
  if (hasInput && (value === null || value < 0 || (maximum !== null && value > maximum))) {
    errors.push(`Оценка должна быть от 0 до ${maximum ?? 'максимального балла'}.`)
  }
  if (errors.length) return { lower: 0, upper: 100, complete: false, hasInput, errors }
  if (!hasInput) return { lower: 0, upper: 100, complete: false, hasInput, errors }
  const percentage = (value! / maximum!) * 100
  return { lower: percentage, upper: percentage, complete: true, hasInput, errors }
}

export function itemBounds(item: Item): Bounds {
  return item.sections
    ? groupBounds(item.sections)
    : scoreBounds(item.score, item.unit === 'percent' ? 100 : number(item.maxPoints))
}

export function weightTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + (number(item.weight) ?? 0), 0)
}

export function groupBounds(items: Item[]): Bounds {
  const result: Bounds = { lower: 0, upper: 0, complete: true, hasInput: false, errors: [] }
  if (!items.length) result.errors.push('Добавьте хотя бы одно задание или раздел.')
  const total = weightTotal(items)
  if (Math.abs(total - 100) > EPSILON) result.errors.push(`Сумма весов: ${format(total)}%. Должно быть 100%.`)
  for (const item of items) {
    const weight = number(item.weight)
    if (weight === null || weight < 0 || weight > 100) {
      result.errors.push(`${item.name || 'Задание'}: укажите вес от 0 до 100%.`)
    }
    if (weight === 0) continue
    const bounds = itemBounds(item)
    result.errors.push(...bounds.errors.map((error) => `${item.name || 'Задание'}: ${error}`))
    result.lower += (bounds.lower * (weight ?? 0)) / 100
    result.upper += (bounds.upper * (weight ?? 0)) / 100
    result.complete &&= bounds.complete
    result.hasInput ||= bounds.hasInput
  }
  return result
}

export function periodBounds(period: Period): Bounds {
  return period.mode === 'total' ? scoreBounds(period.total, 100) : groupBounds(period.items)
}

export function courseBounds(periods: Record<Term, Bounds>): Bounds {
  return TERMS.reduce<Bounds>(
    (result, term) => {
      const period = periods[term]
      result.lower += period.lower * PERIODS[term].weight
      result.upper += period.upper * PERIODS[term].weight
      result.complete &&= period.complete
      result.hasInput ||= period.hasInput
      result.errors.push(...period.errors.map((error) => `${PERIODS[term].label}: ${error}`))
      return result
    },
    { lower: 0, upper: 0, complete: true, hasInput: false, errors: [] }
  )
}

export function failedMinimum(periods: Record<Term, Bounds>): boolean {
  return TERMS.some((term) => periods[term].upper + EPSILON < PERIODS[term].minimum)
}

export type Target = {
  message: string
  requirements: { term: Term; total: number; remainingAverage: number }[]
}

export function targetRequirement(periods: Record<Term, Bounds>, target: number): Target {
  const course = courseBounds(periods)
  const result: Target = { message: '', requirements: [] }
  if (course.errors.length) return { ...result, message: 'Исправьте оценки и веса для расчёта.' }
  if (failedMinimum(periods)) return { ...result, message: 'Невозможно из-за неудачного порога на экзамене.' }
  if (course.complete) {
    return {
      ...result,
      message:
        course.lower + EPSILON >= target
          ? `Уже достиг с оценкой ${course.lower.toFixed(1)}.`
          : `Не достигнуто с оценкой ${course.lower.toFixed(1)}.`,
    }
  }
  if (course.upper + EPSILON < target) return { ...result, message: 'Невозможно с оставшимися оценками.' }
  if (course.lower + EPSILON >= target) {
    return { ...result, message: 'Уже гарантировано, если выполнены минимальные пороги.' }
  }
  for (const term of TERMS) {
    const period = periods[term]
    if (period.complete) continue
    const othersMaximum = TERMS.filter((other) => other !== term).reduce(
      (sum, other) => sum + periods[other].upper * PERIODS[other].weight,
      0
    )
    const needed = Math.max(PERIODS[term].minimum, period.lower, (target - othersMaximum) / PERIODS[term].weight)
    if (needed > period.upper + EPSILON) continue
    result.requirements.push({
      term,
      total: needed,
      remainingAverage: (100 * Math.max(0, needed - period.lower)) / (period.upper - period.lower),
    })
  }
  const best = result.requirements.reduce((current, next) => (current.total <= next.total ? current : next))
  result.message = `Нужно минимум ${roundUp(best.total)} на ${PERIODS[best.term].label}.`
  return result
}

// Changing input units preserves the same earned percentage, including fractional points.
export function changeUnit(item: Item, unit: Unit): Item {
  if (unit === item.unit) return item
  const maximum = number(item.maxPoints)
  const score = number(item.score)
  if (maximum === null || maximum <= 0 || score === null) return { ...item, unit }
  const converted = unit === 'percent' ? (score / maximum) * 100 : (score / 100) * maximum
  return { ...item, unit, score: String(Number(converted.toFixed(10))) }
}

export function format(value: number): string {
  return Number(value.toFixed(2)).toString()
}

export function roundUp(value: number): string {
  return (Math.ceil(value * 100 - EPSILON) / 100).toFixed(2)
}
