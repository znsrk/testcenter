import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type ResultRow = {
  id: string
  user_id: string
  test_name: string
  score: number
  total_questions: number
  passed: boolean
  test_date: string // date
  created_at: string // timestamptz
  sections?: { section: string; score: number; maxScore: number }[] | null
  users?: { first_name: string } | null // added for joined user
}

function toCSV(rows: ResultRow[]) {
  const headers = ['id','user_id','first_name','test_name','score','total_questions','passed','test_date','created_at']
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      if (h === 'first_name') return esc(r.users?.first_name)
      return esc((r as any)[h])
    }).join(','))
  ]
  return lines.join('\n')
}

export default function AdminResults() {
  const [rows, setRows] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('') // simple search
  const [showSectionsFor, setShowSectionsFor] = useState<Record<string, boolean>>({})

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('test_results')
      .select(`
        *,
        users: user_id (
          first_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1000)
    if (error) {
      setError(error.message)
    } else {
      setRows((data ?? []) as ResultRow[])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter(r =>
      r.test_name?.toLowerCase().includes(needle) ||
      r.user_id?.toLowerCase().includes(needle) ||
      r.users?.first_name?.toLowerCase().includes(needle) || // allow searching by first name
      r.test_date?.toLowerCase().includes(needle)
    )
  }, [rows, q])

  const exportCSV = () => {
    const csv = toCSV(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'test_results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <strong>All test results</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by test, user name, user ID, date"
            style={{ padding: 6, width: 260 }}
          />
          <button type="button" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" onClick={exportCSV} disabled={filtered.length === 0}>
            Export CSV
          </button>
        </div>
      </div>

      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      {!error && loading && <div>Loading…</div>}
      {!error && !loading && filtered.length === 0 && <div>No results.</div>}

      {!error && !loading && filtered.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Test</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>User</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Score</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Passed</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Date</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Created</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td style={{ borderBottom: '1px solid #f3f4f6', padding: 8 }}>{r.test_name}</td>
                  <td style={{ borderBottom: '1px solid #f3f4f6', padding: 8 }}>
                    <code style={{ fontSize: 12 }}>
                      {r.users?.first_name ? r.users.first_name : r.user_id}
                    </code>
                  </td>
                  <td style={{ borderBottom: '1px solid #f3f4f6', padding: 8 }}>
                    {r.score} / {r.total_questions}
                  </td>
                  <td style={{ borderBottom: '1px solid #f3f4f6', padding: 8 }}>
                    {r.passed ? 'Yes' : 'No'}
                  </td>
                  <td style={{ borderBottom: '1px solid #f3f4f6', padding: 8 }}>{r.test_date}</td>
                  <td style={{ borderBottom: '1px solid #f3f4f6', padding: 8 }}>
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td style={{ borderBottom: '1px solid #f3f4f6', padding: 8 }}>
                    {Array.isArray(r.sections) && r.sections.length > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setShowSectionsFor(prev => ({ ...prev, [r.id]: !prev[r.id] }))
                        }
                      >
                        {showSectionsFor[r.id] ? 'Hide' : 'Show'} sections
                      </button>
                    ) : (
                      <span style={{ color: '#6b7280' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.map(r => (
            showSectionsFor[r.id] && Array.isArray(r.sections) && r.sections.length > 0 ? (
              <div key={`${r.id}-sections`} style={{ background: '#f9fafb', border: '1px solid #eee', borderRadius: 6, padding: 10, marginTop: 8 }}>
                <strong>Sections for {r.test_name}</strong>
                <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                  {r.sections.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{s.section}</span>
                      <span>{s.score} / {s.maxScore}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          ))}
        </div>
      )}
    </div>
  )
}