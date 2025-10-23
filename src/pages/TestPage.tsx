import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getTestById,
  scoreAnswers,
  submitAttempt,
  type AnswerKey,
  type TestContent,
} from '../lib/tests'

// Timer component
function TestTimer({ secondsLeft }: { secondsLeft: number }) {
  const min = Math.floor(secondsLeft / 60)
  const sec = secondsLeft % 60
  return (
    <div className="w-full text-center py-2 bg-blue-50 border-b border-blue-200 mb-4 sticky top-0 z-10">
      <span className="font-bold text-lg text-blue-700">
        Time Remaining: {min.toString().padStart(2, '0')}:{sec.toString().padStart(2, '0')}
      </span>
    </div>
  )
}

export default function TestPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testName, setTestName] = useState('')
  const [content, setContent] = useState<TestContent | null>(null)
  const [timeLimit, setTimeLimit] = useState<number | null>(null)

  const [answers, setAnswers] = useState<Record<string, AnswerKey | undefined>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  // Timer state
  const [secondsLeft, setSecondsLeft] = useState<number>(0)
  const [timerActive, setTimerActive] = useState(false)
  const autoSubmitDone = useRef(false)

  // Load the test
  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!id) return
      setLoading(true)
      setError(null)
      const { data, error } = await getTestById(id)
      if (!ignore) {
        if (error || !data) {
          setError(error || 'Failed to load test')
        } else {
          setContent(data.content)
          setTestName(data.name)
          setTimeLimit(data.time_limit_minutes ?? null)
        }
        setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [id])

  // Start timer when test loads
  useEffect(() => {
    if (content && timeLimit && !timerActive) {
      setSecondsLeft(timeLimit * 60)
      setTimerActive(true)
    }
  }, [content, timeLimit, timerActive])

  // Timer countdown & auto-submit
  useEffect(() => {
    if (!timerActive || submitted) return

    if (secondsLeft === 0 && !autoSubmitDone.current) {
      autoSubmitDone.current = true
      autoSubmit()
      return
    }

    if (secondsLeft > 0) {
      const interval = setInterval(() => {
        setSecondsLeft(s => s - 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [secondsLeft, submitted, timerActive])

  const autoSubmit = async () => {
    setTimedOut(true)
    setSubmitting(true)
    if (!content || !user?.id) {
      setError("Couldn't submit: user not logged in or test not loaded.")
      setSubmitted(true)
      setSubmitting(false)
      return
    }
    await submitAttempt({
      userId: user.id,
      testName: testName || 'Test',
      content,
      answers
    })
    setSubmitting(false)
    setSubmitted(true)
  }

  const handleSelect = (qid: string, key: AnswerKey) => {
    setAnswers(prev => ({ ...prev, [qid]: key }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    if (!content || !user?.id) return
    await submitAttempt({
      userId: user.id,
      testName: testName || 'Test',
      content,
      answers
    })
    setSubmitting(false)
    setSubmitted(true)
    setTimedOut(false)
    setTimerActive(false)
  }

  const reset = () => {
    setAnswers({})
    setSubmitted(false)
    setTimedOut(false)
    setError(null)
    autoSubmitDone.current = false
    if (timeLimit) {
      setSecondsLeft(timeLimit * 60)
      setTimerActive(true)
    } else {
      setSecondsLeft(0)
      setTimerActive(false)
    }
  }

  const totalMax = useMemo(() => {
    return content?.sections.reduce(
      (s, sec) => s + sec.questions.reduce((qsum, q) => qsum + q.maxScore, 0),
      0
    ) ?? 0
  }, [content])

  const score = useMemo(() => {
    if (!submitted || !content) return 0
    return scoreAnswers(content, answers).totalScore
  }, [submitted, content, answers])

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-[#007BFF] hover:underline">← Back</Link>
          <div />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {(timerActive && secondsLeft > 0 && !submitted) && (
          <TestTimer secondsLeft={secondsLeft} />
        )}

        {loading && <p className="text-gray-600">Loading test...</p>}

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && content && (
          <>
            {!submitted && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-lg border border-gray-200 p-4">
                  <h1 className="text-2xl font-bold">{testName}</h1>
                  {totalMax > 0 && (
                    <p className="text-sm text-gray-500 mt-1">Total points: {totalMax}</p>
                  )}
                  {timeLimit && (
                    <p className="text-sm text-gray-400 mt-1">Time limit: {timeLimit} min</p>
                  )}
                </div>

                {content.sections.map((sec, si) => (
                  <div key={si} className="rounded-lg border border-gray-200 p-4">
                    <p className="text-sm text-gray-500 mb-1">Section {si + 1}</p>
                    <h4 className="font-semibold mb-2">{sec.name}</h4>
                    {sec.description ? (
                      <div
                        className="text-sm text-gray-600 mb-3"
                        style={{
                          maxWidth: '100%',
                          // REMOVE maxHeight, overflow, wordBreak, whiteSpace
                        }}
                        title={sec.description}
                      >
                        {sec.description}
                      </div>
                    ) : null}
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

            {submitted && (
              <div className="space-y-6">
                {timedOut && (
                  <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-yellow-700 text-sm">
                    Time is up! Your test was automatically submitted.
                  </div>
                )}
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-lg font-semibold">Your Score</h3>
                  <p className="text-2xl mt-2">
                    {score} / {totalMax} ({Math.round((score / (totalMax || 1)) * 100)}%)
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={reset} className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50">Retake</button>
                  <Link to="/" className="text-[#007BFF] hover:underline self-center">Back to Home</Link>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}