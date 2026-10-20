import { useId, useState } from 'react'
import {
  changeUnit,
  courseBounds,
  createItem,
  failedMinimum,
  format,
  initialPeriods,
  itemBounds,
  PERIODS,
  periodBounds,
  roundUp,
  targetRequirement,
  TERMS,
  weightTotal,
} from './calculator/model'
import type { Bounds, Item, Period, Term, Unit } from './calculator/model'
import './calculator/styles.css'

export function GradeCalculator() {
  const [periods, setPeriods] = useState(initialPeriods)
  const bounds = { mid: periodBounds(periods.mid), end: periodBounds(periods.end), fin: periodBounds(periods.fin) }
  const course = courseBounds(bounds)
  const failed = failedMinimum(bounds)
  const valid = course.errors.length === 0
  const update = (term: Term, period: Period) => setPeriods((current) => ({ ...current, [term]: period }))

  return (
    <main className="grade-calculator" lang="ru">
      <div className="calc-shell">
        <header className="calc-heading">
          <h1>Калькулятор оценок</h1>
          <p>Введите итоговые оценки или рассчитайте их по отдельным заданиям и разделам экзамена.</p>
          <div className="calc-formula">30% × 1-я аттестация + 30% × 2-я аттестация + 40% × Final</div>
        </header>

        <div className="calc-periods">
          {TERMS.map((term) => (
            <PeriodEditor
              key={term}
              term={term}
              period={periods[term]}
              bounds={bounds[term]}
              onChange={(period) => update(term, period)}
            />
          ))}
        </div>

        <section className="calc-summary" aria-label="Итог курса" aria-live="polite">
          <h2>Итог курса</h2>
          {!valid ? (
            <p role="alert">Исправьте оценки и веса в отмеченных разделах, чтобы получить корректный итог.</p>
          ) : !course.hasInput ? (
            <p>Введите оценки для расчёта. Пустые поля — ещё не полученные оценки, а не нули.</p>
          ) : (
            <>
              <div className="calc-result">
                <span>{course.complete ? 'Итоговая оценка' : 'Уже набрано'}</span>
                <strong>
                  {format(course.lower)} <small>/ 100</small>
                </strong>
              </div>
              {!course.complete && (
                <p>
                  Возможный итог: {format(course.lower)}–{format(course.upper)} из 100.
                </p>
              )}
              {(course.complete || failed) && (
                <p className={`calc-status ${failed || course.lower < 50 ? 'calc-failed' : 'calc-passed'}`}>
                  {failed
                    ? 'Минимальный порог не выполнен или уже недостижим.'
                    : course.lower >= 90
                      ? 'Повышенная стипендия'
                      : course.lower >= 70
                        ? 'Стипендия сохраняется'
                        : course.lower >= 50
                          ? 'Проходной балл достигнут'
                          : 'Проходной балл не достигнут'}
                </p>
              )}
              <div className="calc-targets">
                {[
                  { score: 50, label: 'Не завалить' },
                  { score: 70, label: 'Сохранить степуху' },
                  { score: 90, label: 'Повышенная степуха' },
                ].map(({ score, label }) => {
                  const target = targetRequirement(bounds, score)
                  return (
                    <div className="calc-target" key={score}>
                      <p>
                        {label} ({score}): {target.message}
                      </p>
                      {target.requirements
                        .filter(({ term }) => periods[term].mode === 'items')
                        .map((requirement) => (
                          <p className="calc-hint" key={requirement.term}>
                            {PERIODS[requirement.term].label}: итог не ниже {roundUp(requirement.total)} из 100; средний
                            результат за оставшуюся работу — от {roundUp(requirement.remainingAverage)}%.
                          </p>
                        ))}
                    </div>
                  )
                })}
              </div>
              {!course.complete && (
                <p className="calc-hint">
                  Для каждой цели расчёт предполагает максимум в остальных незавершённых аттестациях и Final. Средний
                  результат за оставшуюся работу учитывает веса её заданий и разделов.
                </p>
              )}
            </>
          )}
          <p className="calc-hint">
            Минимумы из прежнего калькулятора: 25 за каждую аттестацию и 50 за Final. Они проверяются по итогам периода,
            а не по отдельным заданиям.
          </p>
        </section>
        <button type="button" className="calc-reset" onClick={() => setPeriods(initialPeriods())}>
          Обнулить
        </button>
      </div>
    </main>
  )
}

function PeriodEditor({
  term,
  period,
  bounds,
  onChange,
}: {
  term: Term
  period: Period
  bounds: Bounds
  onChange: (period: Period) => void
}) {
  const config = PERIODS[term]
  const id = useId()
  const valid = !bounds.errors.length
  return (
    <section className="calc-period" aria-labelledby={id}>
      <div className="calc-period-heading">
        <div>
          <h2 id={id}>{config.label}</h2>
          <p>{config.title}</p>
        </div>
        <span className="calc-badge">{config.weight * 100}% курса</span>
      </div>
      <div className="calc-modes" role="group" aria-label={`Способ ввода ${config.label}`}>
        <button
          type="button"
          aria-pressed={period.mode === 'total'}
          onClick={() => onChange({ ...period, mode: 'total' })}
        >
          Итоговая оценка
        </button>
        <button
          type="button"
          aria-pressed={period.mode === 'items'}
          onClick={() => onChange({ ...period, mode: 'items' })}
        >
          По заданиям и разделам
        </button>
      </div>
      {period.mode === 'total' ? (
        <NumberField
          label={`${config.label} (${config.weight * 100}%)`}
          value={period.total}
          max={100}
          placeholder={config.placeholder}
          onChange={(total) => onChange({ ...period, total })}
        />
      ) : (
        <>
          <p className="calc-hint">
            {term === 'fin'
              ? 'Добавьте разделы Final и укажите их реальные веса. В таблице веса разделов не заданы.'
              : 'По таблице: четыре задания по 15% и экзамен 40% от аттестации. Веса можно изменить.'}{' '}
            Вводите баллы из максимума или проценты за каждое задание.
          </p>
          <ItemsEditor
            items={period.items}
            courseWeight={config.weight}
            context={config.label}
            onChange={(items) => onChange({ ...period, items })}
          />
        </>
      )}
      {!valid && (
        <ul className="calc-errors" role="alert">
          {bounds.errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
      {valid && bounds.hasInput && (
        <div className="calc-period-result">
          <p>
            {bounds.complete ? 'Итог' : 'Набрано'} {config.label}: {format(bounds.lower)} / 100
          </p>
          {!bounds.complete && <p>С оставшейся работой: до {format(bounds.upper)} / 100</p>}
          <p>
            Вклад в курс: {format(bounds.lower * config.weight)} / {config.weight * 100}
          </p>
        </div>
      )}
    </section>
  )
}

function ItemsEditor({
  items,
  courseWeight,
  context,
  onChange,
  nested = false,
}: {
  items: Item[]
  courseWeight: number
  context: string
  onChange: (items: Item[]) => void
  nested?: boolean
}) {
  const total = weightTotal(items)
  return (
    <div className="calc-items">
      <p className={`calc-weight-total ${Math.abs(total - 100) > 1e-8 ? 'calc-failed' : ''}`}>
        Сумма весов {context}: {format(total)}% / 100%
      </p>
      {items.map((item, index) => (
        <ItemEditor
          key={item.id}
          item={item}
          nested={nested}
          context={`${context}, ${item.name || `задание ${index + 1}`}`}
          courseWeight={courseWeight}
          onChange={(value) => onChange(items.map((existing) => (existing.id === item.id ? value : existing)))}
          onRemove={() => onChange(items.filter((existing) => existing.id !== item.id))}
        />
      ))}
      <button
        type="button"
        className="calc-secondary"
        onClick={() =>
          onChange([
            ...items,
            createItem(crypto.randomUUID(), `${nested ? 'Раздел' : 'Новое задание'} ${items.length + 1}`),
          ])
        }
      >
        {nested ? 'Добавить раздел' : 'Добавить задание / раздел'}
      </button>
    </div>
  )
}

function ItemEditor({
  item,
  context,
  courseWeight,
  nested,
  onChange,
  onRemove,
}: {
  item: Item
  context: string
  courseWeight: number
  nested: boolean
  onChange: (item: Item) => void
  onRemove: () => void
}) {
  const id = useId()
  const bounds = itemBounds(item)
  const maximum = item.unit === 'percent' ? 100 : Number(item.maxPoints)
  const weight = Number(item.weight)
  const weighted = Number.isFinite(weight) ? weight * courseWeight : 0
  return (
    <fieldset className="calc-item" aria-label={context}>
      <div className="calc-item-heading">
        <label htmlFor={`${id}-name`} className="calc-sr-only">
          Название
        </label>
        <input
          id={`${id}-name`}
          className="calc-item-name"
          value={item.name}
          onChange={(event) => onChange({ ...item, name: event.target.value })}
          placeholder="Название задания"
        />
        <button
          type="button"
          className="calc-remove"
          aria-label={`Удалить ${item.name || 'задание'}`}
          onClick={onRemove}
        >
          ×
        </button>
      </div>
      <div className="calc-item-fields">
        <NumberField
          label="Вес (%)"
          value={item.weight}
          max={100}
          onChange={(value) => onChange({ ...item, weight: value })}
        />
        {!item.sections && (
          <>
            <label className="calc-field">
              Формат оценки
              <select value={item.unit} onChange={(event) => onChange(changeUnit(item, event.target.value as Unit))}>
                <option value="points">Баллы</option>
                <option value="percent">Проценты</option>
              </select>
            </label>
            <NumberField
              label={item.unit === 'percent' ? 'Оценка (%)' : 'Оценка (баллы)'}
              value={item.score}
              max={Number.isFinite(maximum) && maximum > 0 ? maximum : undefined}
              placeholder="Не получена"
              onChange={(value) => onChange({ ...item, score: value })}
            />
            {item.unit === 'points' && (
              <NumberField
                label="Максимум баллов"
                value={item.maxPoints}
                onChange={(value) => onChange({ ...item, maxPoints: value })}
              />
            )}
          </>
        )}
      </div>
      <p className="calc-hint">
        {format(Number.isFinite(weight) ? weight : 0)}% {nested ? 'родительского задания' : 'периода'} ={' '}
        {format(weighted)}% курса.
        {!item.sections && item.unit === 'percent' && ' 80% означает 80% от веса задания, а не 80 баллов аттестации.'}
      </p>
      {!nested &&
        (item.sections ? (
          <>
            <ItemsEditor
              items={item.sections}
              context={item.name || 'Разделы'}
              nested
              courseWeight={weighted / 100}
              onChange={(sections) => onChange({ ...item, sections })}
            />
            <button
              type="button"
              className="calc-text-button"
              onClick={() =>
                onChange({
                  ...item,
                  sections: undefined,
                  score:
                    bounds.errors.length === 0 && bounds.complete
                      ? String(Number(((bounds.lower / 100) * maximum).toFixed(10)))
                      : '',
                })
              }
            >
              Ввести оценку целиком
            </button>
          </>
        ) : (
          <button
            type="button"
            className="calc-text-button"
            onClick={() =>
              onChange({
                ...item,
                sections: [
                  {
                    ...createItem(crypto.randomUUID(), 'Раздел 1', '100', item.maxPoints),
                    score: item.score,
                    unit: item.unit,
                  },
                ],
              })
            }
          >
            Разбить на разделы
          </button>
        ))}
      {!bounds.errors.length && bounds.hasInput && (
        <p className="calc-item-result">
          {bounds.complete ? 'Результат' : 'Набрано'}: {format(bounds.lower)}% →{' '}
          {format((bounds.lower * weighted) / 100)} балла курса
        </p>
      )}
    </fieldset>
  )
}

function NumberField({
  label,
  value,
  onChange,
  max,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  max?: number
  placeholder?: string
}) {
  const id = useId()
  return (
    <div className="calc-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step="any"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
