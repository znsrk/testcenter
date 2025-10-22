import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getTestById,
  isAdminEmail,
  listPublishedTests,
  scoreAnswers,
  submitAttempt,
  uploadTestFromJSON,
  type AnswerKey,
  type TestContent,
  type UploadTestJSON
} from '../lib/tests'

interface TestListItem {
  id: string
  name: string
  description?: string | null
  time_limit_minutes?: number | null
}

export function TakeTestPage() {
  const { user } = useAuth()
  const [tests, setTests] = useState<TestListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeTestId, setActiveTestId] = useState<string | null>(null)
  const [activeTestName, setActiveTestName] = useState<string>('')
  const [content, setContent] = useState<TestContent | null>(null)

  const [answers, setAnswers] = useState<Record<string, AnswerKey | undefined>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const admin = isAdminEmail(user?.email)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await listPublishedTests()
      if (error) setError(error)
      if (data) setTests(data as TestListItem[])
      setLoading(false)
    }
    load()
  }, [])

  const selectTest = async (id: string) => {
    setError(null)
    setActiveTestId(id)
    setSubmitted(false)
    setAnswers({})
    const { data, error } = await getTestById(id)
    if (error || !data) {
      setError(error || 'Failed to load test')
      return
    }
    setContent(data.content)
    setActiveTestName(data.name)
  }

  const totalMax = useMemo(
    () => content?.sections.reduce((s, sec) => s + sec.questions.reduce((qsum, q) => qsum + q.maxScore, 0), 0) ?? 0,
    [content]
  )
  const score = useMemo(() => {
    if (!submitted || !content) return 0
    return scoreAnswers(content, answers).totalScore
  }, [submitted, content, answers])

  const handleSelect = (qid: string, key: AnswerKey) => {
    setAnswers(prev => ({ ...prev, [qid]: key }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content || !user?.id) return
    setSubmitting(true)
    const { error } = await submitAttempt({
      userId: user.id,
      testName: activeTestName || 'Test',
      content,
      answers
    })
    setSubmitting(false)
    setSubmitted(true)
    if (error) setError(error)
  }

  const reset = () => {
    setAnswers({})
    setSubmitted(false)
  }

  const handleUpload = async (file?: File | null) => {
    if (!file || !user?.id) return
    setError(null)
    try {
      const text = await file.text()
      const parsed: UploadTestJSON = JSON.parse(text)
      // Minimal validation
      if (!parsed.name || !parsed.content?.sections?.length) {
        setError('Invalid test JSON: missing name or sections')
        return
      }
      const { error } = await (async () => {
        const res = await uploadTestFromJSON(parsed, user.id)
        if (res.error) return { error: res.error }
        // refresh list
        const { data, error: listErr } = await listPublishedTests()
        if (!listErr && data) setTests(data as TestListItem[])
        return {}
      })()
      if (error) setError(error)
    } catch (e: any) {
      setError(e.message || 'Failed to parse/upload JSON')
    }
  }

  return (
    <div className="bg-white">
      <div className="max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Take a Test</h2>
            <p className="text-gray-500">Choose a published test from the list or, if you are an admin, upload a new one.</p>
          </div>
          {admin && (
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="file"
                accept="application/json"
                onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <span className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50">Upload JSON</span>
            </label>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Test list and active panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4">
            <div className="space-y-2">
              {loading && <p className="text-gray-500">Loading tests...</p>}
              {!loading && tests.length === 0 && (
                <p className="text-gray-500">No tests available yet.</p>
              )}
              {tests.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTest(t.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition
                    ${activeTestId === t.id ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className="font-semibold">{t.name}</div>
                  {t.description && <div className="text-sm text-gray-500">{t.description}</div>}
                  {t.time_limit_minutes ? (
                    <div className="text-xs text-gray-400 mt-1">{t.time_limit_minutes} min</div>
                  ) : null}
                </button>
              ))}
            </div>

            {admin && (
              <details className="mt-6 rounded-lg border border-gray-200 p-3 bg-[#F9FAFB]">
                <summary className="cursor-pointer font-medium">JSON format example</summary>
                <pre className="mt-2 text-xs text-gray-700 overflow-x-auto">
{`{
  "name": "Sample ENT",
  "description": "Demo test",
  "time_limit_minutes": 60,
  "is_published": true,
  "content": {
    "sections": [
      {
        "name": "Mathematics",
        "questions": [
          {
            "id": "m1",
            "text": "What is 2+2?",
            "maxScore": 10,
            "choices": [
              {"key": "a", "label": "3"},
              {"key": "b", "label": "4"},
              {"key": "c", "label": "5"}
            ],
            "correct": "b"
          }
        ]
      }
    ]
  }
}`}
                </pre>
              </details>
            )}
          </aside>

          <section className="lg:col-span-8">
            {!activeTestId && (
              <div className="rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600">Select a test on the left to begin.</p>
              </div>
            )}

            {activeTestId && content && !submitted && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-xl font-semibold">{activeTestName}</h3>
                  {totalMax > 0 && (
                    <p className="text-sm text-gray-500 mt-1">Total points: {totalMax}</p>
                  )}
                </div>

                {content.sections.map((sec, si) => (
                  <div key={si} className="rounded-lg border border-gray-200 p-4">
                    <p className="text-sm text-gray-500 mb-1">Section {si + 1}</p>
                    <h4 className="font-semibold mb-3">{sec.name}</h4>
                    <div className="space-y-4">
                      {sec.questions.map((q, qi) => (
                        <div key={q.id} className="rounded-md border border-gray-200 p-3">
                          <p className="text-sm text-gray-500 mb-1">Question {qi + 1}</p>
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
                    </div>
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={submitting || !user?.id}
                  className="bg-[#007BFF] text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </form>
            )}

            {activeTestId && content && submitted && (
              <div className="space-y-6">
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-lg font-semibold">Your Score</h3>
                  <p className="text-2xl mt-2">
                    {score} / {totalMax} ({Math.round((score / (totalMax || 1)) * 100)}%)
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">By Section</h4>
                  {useMemo(() => {
                    const by = scoreAnswers(content, answers).sections
                    return by.map((s) => (
                      <div key={s.section} className="flex justify-between rounded-md border border-gray-200 p-2">
                        <span>{s.section}</span>
                        <span className="font-medium">{s.score} / {s.maxScore}</span>
                      </div>
                    ))
                  }, [content, answers]).map((el) => el)}
                </div>
                <div className="flex gap-3">
                  <button onClick={reset} className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50">Retake</button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}