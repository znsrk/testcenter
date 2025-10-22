import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isAdminEmail, listPublishedTests, uploadTestFromJSON, type UploadTestJSON } from '../lib/tests'
import { useEffect, useState } from 'react';

function TestTimer({ secondsLeft }: { secondsLeft: number }) {
  const min = Math.floor(secondsLeft / 60);
  const sec = secondsLeft % 60;
  return (
    <div className="w-full text-center py-2 bg-blue-50 border-b border-blue-200 mb-4 sticky top-0 z-10">
      <span className="font-bold text-lg text-blue-700">
        Time Remaining: {min.toString().padStart(2, '0')}:{sec.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

interface TestListItem {
  id: string
  name: string
  description?: string | null
  time_limit_minutes?: number | null
}

export function TakeTestPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tests, setTests] = useState<TestListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const admin = isAdminEmail(user?.email)

  // Track selected test and timer
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
  const selectedTest = tests.find(t => t.id === selectedTestId) ?? null

  const [secondsLeft, setSecondsLeft] = useState<number>(0)
  // Reset timer when selecting a test
  useEffect(() => {
    if (selectedTest?.time_limit_minutes) {
      setSecondsLeft(selectedTest.time_limit_minutes * 60)
    } else {
      setSecondsLeft(0)
    }
  }, [selectedTestId, selectedTest?.time_limit_minutes])

  // Timer countdown
  useEffect(() => {
    if (!selectedTestId || secondsLeft <= 0) return
    const interval = setInterval(() => {
      setSecondsLeft(s => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [selectedTestId, secondsLeft])

  const handleUpload = async (file?: File | null) => {
    if (!file || !user?.id) return
    setError(null)
    try {
      const text = await file.text()
      const parsed: UploadTestJSON = JSON.parse(text)
      if (!parsed.name || !parsed.content?.sections?.length) {
        setError('Invalid test JSON: missing name or sections')
        return
      }
      const res = await (async () => {
        const r = await uploadTestFromJSON(parsed, user.id)
        if (r.error) return { error: r.error }
        const { data, error: listErr } = await listPublishedTests()
        if (!listErr && data) setTests(data as TestListItem[])
        return {}
      })()
      if ((res as any).error) setError((res as any).error)
    } catch (e: any) {
      setError(e.message || 'Failed to parse/upload JSON')
    }
  }

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

  // When user clicks a test card, select and go to test page
  const handleTestClick = (testId: string) => {
    setSelectedTestId(testId)
    const test = tests.find(t => t.id === testId)
    if (test && test.time_limit_minutes) {
      setSecondsLeft(test.time_limit_minutes * 60)
    }
    setTimeout(() => {
      navigate(`/test/${testId}`)
    }, 150) // slight delay to show selection
  }

  return (
    <div className="bg-white">
      <div className="max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Take a Test</h2>
            <p className="text-gray-500">Choose a published test from the list and complete it.</p>
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

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4">
            <div className="space-y-2">
              {loading && <p className="text-gray-500">Loading tests...</p>}
              {!loading && tests.length === 0 && (
                <p className="text-gray-500">No tests available yet.</p>
              )}
              {tests.map((t) => (
                <div
                  key={t.id}
                  className={`block w-full text-left px-4 py-3 rounded-lg border transition bg-white border-gray-200 hover:bg-blue-50 ${selectedTestId === t.id ? 'border-blue-400 bg-blue-100' : ''}`}
                  style={{ position: 'relative', cursor: 'pointer' }}
                  onClick={() => handleTestClick(t.id)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selectedTestId === t.id}
                >
                  <span className="font-semibold block mb-1">
                    {t.name}
                  </span>
                  {t.description && (
                    <div
                      className="text-sm text-gray-500 mb-2"
                      style={{
                        maxWidth: '100%',
                        // Remove maxHeight and overflow so it always expands fully
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-line',
                      }}
                      title={t.description}
                    >
                      {t.description}
                    </div>
                  )}
                  {t.time_limit_minutes ? (
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <span>{t.time_limit_minutes} min</span>
                    </div>
                  ) : null}
                </div>
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
        "description": "Optional instructions for this section.",
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

          <section className="lg:col-span-8 relative">
            {selectedTest && selectedTest.time_limit_minutes ? (
              <TestTimer secondsLeft={secondsLeft} />
            ) : null}
            <div className="rounded-lg border border-gray-200 p-6 mt-0">
              {selectedTest ? (
                <div>
                  <h3 className="text-xl font-bold">{selectedTest.name}</h3>
                  {selectedTest.description && (
                    <div
                      className="text-sm text-gray-500 mb-2"
                      style={{
                        maxWidth: '100%',
                        // Remove maxHeight and overflow so it always expands fully
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-line',
                      }}
                      title={selectedTest.description}
                    >
                      {selectedTest.description}
                    </div>
                  )}
                  <p className="text-gray-400 mb-4">Time limit: {selectedTest.time_limit_minutes} min</p>
                </div>
              ) : (
                <p className="text-gray-600">
                  Click a test on the left to preview and begin.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}