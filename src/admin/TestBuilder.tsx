import type { TestContent, SectionDefinition, QuestionDefinition, Choice, AnswerKey } from '../lib/tests'

type Props = {
  value: TestContent
  onChange: (next: TestContent) => void
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function nextChoiceKey(existing: Choice[]): AnswerKey {
  const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let i = 0; i < base.length; i++) {
    const k = base[i]
    if (!existing.find(c => c.key === k)) return k
  }
  // fallback
  return String(existing.length + 1)
}

function defaultChoices(): Choice[] {
  return [
    { key: 'A', label: '' },
    { key: 'B', label: '' },
    { key: 'C', label: '' },
    { key: 'D', label: '' },
  ]
}

function reletterChoices(choices: Choice[]): Choice[] {
  const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return choices.map((c, i) => ({ ...c, key: base[i] || String(i + 1) }))
}

export default function TestBuilder({ value, onChange }: Props) {
  const addSection = () => {
    const next = clone(value)
    next.sections.push({
      name: `Section ${next.sections.length + 1}`,
      description: '',
      questions: []
    } as SectionDefinition)
    onChange(next)
  }

  const removeSection = (si: number) => {
    const next = clone(value)
    next.sections.splice(si, 1)
    onChange(next)
  }

  const updateSectionName = (si: number, name: string) => {
    const next = clone(value)
    next.sections[si].name = name
    onChange(next)
  }

  const updateSectionDescription = (si: number, description: string) => {
    const next = clone(value)
    next.sections[si].description = description
    onChange(next)
  }

  const addQuestion = (si: number) => {
    const next = clone(value)
    const q: QuestionDefinition = {
      id: `s${si + 1}q${next.sections[si].questions.length + 1}-${Date.now().toString(36)}`,
      text: '',
      choices: defaultChoices(),
      correct: 'A',
      maxScore: 1
    }
    next.sections[si].questions.push(q)
    onChange(next)
  }

  const removeQuestion = (si: number, qi: number) => {
    const next = clone(value)
    next.sections[si].questions.splice(qi, 1)
    onChange(next)
  }

  const updateQuestionText = (si: number, qi: number, text: string) => {
    const next = clone(value)
    next.sections[si].questions[qi].text = text
    onChange(next)
  }

  const updateQuestionMaxScore = (si: number, qi: number, v: string) => {
    const next = clone(value)
    const n = Number(v)
    next.sections[si].questions[qi].maxScore = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
    onChange(next)
  }

  const addChoice = (si: number, qi: number) => {
    const next = clone(value)
    const q = next.sections[si].questions[qi]
    const key = nextChoiceKey(q.choices)
    q.choices.push({ key, label: '' })
    onChange(next)
  }

  const removeChoice = (si: number, qi: number, ci: number) => {
    const next = clone(value)
    const q = next.sections[si].questions[qi]
    q.choices.splice(ci, 1)
    q.choices = reletterChoices(q.choices)
    // If correct was removed, reset to first
    if (!q.choices.find(c => c.key === q.correct)) {
      q.correct = q.choices[0]?.key ?? 'A'
    }
    // If no choices remain, ensure defaults exist
    if (q.choices.length === 0) {
      q.choices = defaultChoices()
      q.correct = 'A'
    }
    onChange(next)
  }

  const updateChoiceLabel = (si: number, qi: number, ci: number, label: string) => {
    const next = clone(value)
    next.sections[si].questions[qi].choices[ci].label = label
    onChange(next)
  }

  const setCorrect = (si: number, qi: number, key: AnswerKey) => {
    const next = clone(value)
    next.sections[si].questions[qi].correct = key
    onChange(next)
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {value.sections.map((sec, si) => (
        <div key={si} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ minWidth: 90 }}>Section {si + 1}</strong>
            <input
              value={sec.name}
              onChange={(e) => updateSectionName(si, e.target.value)}
              placeholder="Section name"
              style={{ flex: 1 }}
            />
            <button type="button" onClick={() => addQuestion(si)}>+ Question</button>
            <button type="button" onClick={() => removeSection(si)} style={{ color: 'crimson' }}>Remove Section</button>
          </div>

          <div style={{ marginBottom: 8 }}>
            <textarea
              value={sec.description ?? ''}
              onChange={(e) => updateSectionDescription(si, e.target.value)}
              placeholder="Optional section description or instructions"
              rows={3}
              style={{ width: '100%', fontFamily: 'inherit' }}
            />
          </div>

          {sec.questions.length === 0 ? (
            <div style={{ fontSize: 12, color: '#666', margin: '8px 0' }}>No questions yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {sec.questions.map((q, qi) => (
                <div key={q.id || qi} style={{ border: '1px solid #eee', borderRadius: 6, padding: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#666' }}>Q{qi + 1}</span>
                    <input
                      value={q.text}
                      onChange={(e) => updateQuestionText(si, qi, e.target.value)}
                      placeholder="Question text"
                      style={{ flex: 1 }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      Max score
                      <input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={q.maxScore}
                        onChange={(e) => updateQuestionMaxScore(si, qi, e.target.value)}
                        style={{ width: 72 }}
                      />
                    </label>
                    <button type="button" onClick={() => removeQuestion(si, qi)} style={{ color: 'crimson' }}>
                      Remove Question
                    </button>
                  </div>

                  <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                    {q.choices.map((c, ci) => (
                      <div key={c.key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="radio"
                          name={`correct-${si}-${qi}`}
                          checked={q.correct === c.key}
                          onChange={() => setCorrect(si, qi, c.key)}
                          aria-label={`Mark ${c.key} as correct`}
                        />
                        <span style={{ width: 20 }}>{c.key}.</span>
                        <input
                          value={c.label}
                          onChange={(e) => updateChoiceLabel(si, qi, ci, e.target.value)}
                          placeholder={`Choice ${c.key} label`}
                          style={{ flex: 1 }}
                        />
                        <button type="button" onClick={() => removeChoice(si, qi, ci)} style={{ fontSize: 12 }}>
                          Remove
                        </button>
                      </div>
                    ))}
                    <div>
                      <button type="button" onClick={() => addChoice(si, qi)} style={{ fontSize: 12 }}>
                        + Add choice
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <div>
        <button type="button" onClick={addSection}>+ Add section</button>
      </div>
    </div>
  )
}