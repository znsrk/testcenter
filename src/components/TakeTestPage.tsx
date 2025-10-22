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

export function TakeTestPage() {
  const { user } = useAuth()
  const [tests, setTests] = useState<TestListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      if (res.error) setError(res.error)
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
                <Link
                  key={t.id}
                  to={`/test/${t.id}`}
                  className="block w-full text-left px-4 py-3 rounded-lg border transition bg-white border-gray-200 hover:bg-gray-50"
                >
                  <div className="font-semibold">{t.name}</div>
                  {t.description && <div className="text-sm text-gray-500">{t.description}</div>}
                  {t.time_limit_minutes ? (
                    <div className="text-xs text-gray-400 mt-1">{t.time_limit_minutes} min</div>
                  ) : null}
                </Link>
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
            <div className="rounded-lg border border-gray-200 p-6">
              <p className="text-gray-600">
                Click a test on the left to open it on a dedicated page.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}