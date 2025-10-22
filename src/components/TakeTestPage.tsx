import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isAdminEmail, listPublishedTests, uploadTestFromJSON, type UploadTestJSON } from '../lib/tests'

interface TestListItem {
  id: string
  name: string
  description?: string | null
  time_limit_minutes?: number | null
}

// --- Timer Hook for Live Countdown ---
// REMOVE unused hook to avoid TS warning

export function TakeTestPage() {
  const { user } = useAuth()
  const [tests, setTests] = useState<TestListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const admin = isAdminEmail(user?.email)

  // --- For Demo: Track which test's timer is running ---
  const [activeTimer, setActiveTimer] = useState<string | null>(null)
  // --- Timer state per test ---
  const [timerMap, setTimerMap] = useState<Record<string, number>>({})

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

  // --- Start timer for selected test ---
  function handleStartTimer(testId: string, minutes?: number) {
    if (!minutes) return
    setActiveTimer(testId)
    setTimerMap((prev) => ({
      ...prev,
      [testId]: minutes * 60,
    }))
  }

  // --- Timer effect ---
  useEffect(() => {
    // Fix: Only index timerMap when activeTimer is not null
    if (!activeTimer) return
    if (typeof timerMap[activeTimer] !== 'number' || timerMap[activeTimer] <= 0) return
    const interval = setInterval(() => {
      setTimerMap((prev) => ({
        ...prev,
        [activeTimer!]: prev[activeTimer!] > 0 ? prev[activeTimer!] - 1 : 0,
      }))
    }, 1000)
    return () => clearInterval(interval)
    // Dependency: timerMap[activeTimer ?? ""] is always a string
  }, [activeTimer, timerMap, timerMap[activeTimer ?? ""]])

  // --- Format timer display ---
  function formatTimer(seconds: number) {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
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
      const res = await (async () => {
        const r = await uploadTestFromJSON(parsed, user.id)
        if (r.error) return { error: r.error }
        // refresh list
        const { data, error: listErr } = await listPublishedTests()
        if (!listErr && data) setTests(data as TestListItem[])
        return {}
      })()
      if ((res as any).error) setError((res as any).error)
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
                  className="block w-full text-left px-4 py-3 rounded-lg border transition bg-white border-gray-200 hover:bg-gray-50"
                  style={{ position: 'relative' }}
                >
                  <Link
                    to={`/test/${t.id}`}
                    className="font-semibold block mb-1"
                  >
                    {t.name}
                  </Link>
                  {/* Description: Scaled and truncated */}
                  {t.description && (
                    <div
                      className="text-sm text-gray-500 mb-2"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 80,
                        overflow: 'auto',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-line',
                      }}
                      title={t.description}
                    >
                      {t.description}
                    </div>
                  )}
                  {/* Time limit + Live Timer */}
                  {t.time_limit_minutes ? (
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <span>{t.time_limit_minutes} min</span>
                      {/* Demo: Start timer button & live countdown */}
                      <button
                        className="ml-2 px-2 py-1 rounded bg-[#EFF6FF] hover:bg-[#BFDBFE] text-[#1D4ED8] text-xs font-semibold"
                        onClick={() => handleStartTimer(t.id, t.time_limit_minutes || undefined)}
                        disabled={activeTimer === t.id}
                        style={{ minWidth: 60 }}
                      >
                        {activeTimer === t.id ? 'Running...' : 'Start Timer'}
                      </button>
                      {activeTimer === t.id && typeof timerMap[t.id] === 'number' && timerMap[t.id] >= 0 && (
                        <span className="ml-2 font-mono text-[#007BFF] text-xs">
                          {formatTimer(timerMap[t.id])}
                        </span>
                      )}
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

          <section className="lg:col-span-8">
            <div className="rounded-lg border border-gray-200 p-6">
              <p className="text-gray-600">
                Click a test on the left to open it on a dedicated page.
                <br/>
                {/* TODO: Move the live timer to your actual test-taking page, near the test questions! */}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}