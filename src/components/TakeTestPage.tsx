import { useMemo, useState } from 'react'

type AnswerKey = string

interface Question {
  id: string
  text: string
  choices: { key: AnswerKey; label: string }[]
  correct: AnswerKey
  section: string
  maxScore: number
}

export function TakeTestPage() {
  const questions = useMemo<Question[]>(
    () => [
      { id: 'q1', text: 'What is 12 × 8?', section: 'Mathematics', maxScore: 10, correct: 'b', choices: [
        { key: 'a', label: '84' },
        { key: 'b', label: '96' },
        { key: 'c', label: '108' },
        { key: 'd', label: '88' },
      ]},
      { id: 'q2', text: 'Which data structure uses FIFO?', section: 'Computer Science', maxScore: 10, correct: 'c', choices: [
        { key: 'a', label: 'Stack' },
        { key: 'b', label: 'Tree' },
        { key: 'c', label: 'Queue' },
        { key: 'd', label: 'Graph' },
      ]},
      { id: 'q3', text: '“Reading Literacy” best evaluates…', section: 'Reading Literacy', maxScore: 10, correct: 'd', choices: [
        { key: 'a', label: 'Mental arithmetic' },
        { key: 'b', label: 'Programming skills' },
        { key: 'c', label: 'Historical dates' },
        { key: 'd', label: 'Understanding written text' },
      ]},
      { id: 'q4', text: 'Capital of Kazakhstan?', section: 'History of Kazakhstan', maxScore: 10, correct: 'b', choices: [
        { key: 'a', label: 'Almaty' },
        { key: 'b', label: 'Astana' },
        { key: 'c', label: 'Shymkent' },
        { key: 'd', label: 'Atyrau' },
      ]},
      { id: 'q5', text: 'Derivative of x^2 is…', section: 'Mathematics', maxScore: 10, correct: 'a', choices: [
        { key: 'a', label: '2x' },
        { key: 'b', label: 'x' },
        { key: 'c', label: 'x^3' },
        { key: 'd', label: '2' },
      ]},
    ],
    []
  )

  const [answers, setAnswers] = useState<Record<string, AnswerKey | undefined>>({})
  const [submitted, setSubmitted] = useState(false)

  const totalMax = questions.reduce((s, q) => s + q.maxScore, 0)
  const score = useMemo(() => {
    if (!submitted) return 0
    return questions.reduce((sum, q) => sum + (answers[q.id] === q.correct ? q.maxScore : 0), 0)
  }, [submitted, answers, questions])

  const bySection = useMemo(() => {
    const map = new Map<string, { earned: number; max: number }>()
    for (const q of questions) {
      const prev = map.get(q.section) || { earned: 0, max: 0 }
      prev.max += q.maxScore
      if (submitted && answers[q.id] === q.correct) prev.earned += q.maxScore
      map.set(q.section, prev)
    }
    return Array.from(map.entries())
  }, [answers, questions, submitted])

  const handleSelect = (qid: string, key: AnswerKey) => {
    setAnswers((prev) => ({ ...prev, [qid]: key }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    // Future step: persist to backend (supabase) and refresh results list
  }

  const reset = () => {
    setAnswers({})
    setSubmitted(false)
  }

  return (
    <div className="bg-white">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold mb-4">Practice Test</h2>
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500 mb-1">Question {idx + 1}</p>
                <p className="font-medium mb-3">{q.text}</p>
                <div className="space-y-2">
                  {q.choices.map((c) => (
                    <label key={c.key} className="flex items-center gap-3 rounded-md border border-gray-200 p-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name={q.id}
                        value={c.key}
                        checked={answers[q.id] === c.key}
                        onChange={() => handleSelect(q.id, c.key)}
                        className="h-4 w-4 text-[#007BFF] focus:ring-[#007BFF]"
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="submit"
              className="bg-[#007BFF] text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-semibold">Your Score</h3>
              <p className="text-2xl mt-2">{score} / {totalMax} ({Math.round((score/(totalMax||1))*100)}%)</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">By Section</h4>
              {bySection.map(([section, s]) => (
                <div key={section} className="flex justify-between rounded-md border border-gray-200 p-2">
                  <span>{section}</span>
                  <span className="font-medium">{s.earned} / {s.max}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Retake
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}