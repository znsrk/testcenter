import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface ResultsPageProps {
  onNavigate: (page: string) => void
  embedded?: boolean
}

interface Section {
  section: string
  score: number
  maxScore: number
}

interface TestResult {
  id: string
  user_id: string
  test_name: string
  score: number
  total_questions: number
  passed: boolean
  test_date: string
  sections: Section[]
}

export function ResultsPage({ onNavigate, embedded = false }: ResultsPageProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [testResults, setTestResults] = useState<TestResult[]>([])

  useEffect(() => {
    const fetchResults = async () => {
      if (!user?.id) return
      setLoading(true)
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .order('test_date', { ascending: false })
      if (!error && data) setTestResults(data as TestResult[])
      setLoading(false)
    }
    fetchResults()
  }, [user?.id])

  const percentageClass = (score: number, total: number) => {
    const pct = total ? (score / total) * 100 : 0
    if (pct >= 80) return 'text-green-600'
    if (pct >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className={`${embedded ? '' : 'min-h-screen'} bg-white flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007BFF] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  if (testResults.length === 0) {
    return (
      <div className={`${embedded ? '' : 'min-h-screen'} bg-white`}>
        <div className={`${embedded ? '' : 'max-w-4xl mx-auto'} px-4 py-8`}>
          {!embedded && (
            <button
              onClick={() => onNavigate('home')}
              className="text-[#007BFF] hover:underline mb-4"
            >
              ← Back to Home
            </button>
          )}
          <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No results</h2>
            <p className="text-gray-600 mb-6">You haven’t taken any tests yet.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${embedded ? '' : 'min-h-screen'} bg-white`}>
      <div className={`${embedded ? '' : 'max-w-4xl mx-auto'} px-4 py-4`}>
        {!embedded && (
          <>
            <button
              onClick={() => onNavigate('home')}
              className="text-[#007BFF] hover:underline mb-4"
            >
              ← Back to Home
            </button>
            <h1 className="text-[28px] font-bold text-black mb-1">ENT Results</h1>
            <p className="text-[#9CA3AF] mb-4">
              {user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email}
            </p>
          </>
        )}

        <div className="space-y-4">
          {testResults.map((t) => {
            const totalMax = t.sections.reduce((sum, s) => sum + s.maxScore, 0)
            return (
              <div key={t.id} className="border border-[#E6EDF8] rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-black">{t.test_name}</h3>
                    <p className="text-sm text-gray-500">{new Date(t.test_date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${percentageClass(t.score, totalMax)}`}>
                      {t.score} / {totalMax}
                    </p>
                    <p className="text-sm text-gray-500">{Math.round((t.score / (totalMax || 1)) * 100)}%</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {t.sections.map((s, idx) => (
                    <div key={idx} className="rounded-md bg-[#F9FAFB] border border-gray-200 p-3">
                      <p className="text-sm text-gray-700">{s.section}</p>
                      <p className="text-sm font-semibold">{s.score} / {s.maxScore}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${t.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {t.passed ? 'Passed' : 'Failed'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}