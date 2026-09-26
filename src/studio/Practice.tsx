import { useEffect, useState } from 'react'
import { ArrowUpRight, Bookmark, Sparkles } from 'lucide-react'
import { post, message } from './api'
import { Empty, ErrorNotice, Filters, JobCard, skillIcons } from './components'
import type { Catalog, Format, Generation, Job, Selection, Skill } from './types'

export function Practice({
  catalog,
  selection,
  setSelection,
  writingOnly = false,
  initialSkill = 'grammar',
  jobs,
  onGenerated,
  onOpen,
  onRetry,
}: {
  catalog: Catalog
  selection: Selection
  setSelection: (s: Selection) => void
  writingOnly?: boolean
  initialSkill?: Skill
  jobs: Job[]
  onGenerated: () => Promise<void>
  onOpen: (id: string) => void
  onRetry: (id: string) => void
}) {
  const [skill, setSkill] = useState<Skill>(writingOnly ? 'writing' : initialSkill)
  const [format, setFormat] = useState<Format>(writingOnly ? 'essay' : 'mixed')
  const [count, setCount] = useState(10)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pendingJobId, setPendingJobId] = useState<string | null>(null)
  const skillInfo = catalog.skills.find((s) => s.id === skill)!
  const active = jobs.some((j) => j.kind !== 'audio' && ['queued', 'running'].includes(j.status))
  useEffect(() => {
    const completed = jobs.find((job) => job.id === pendingJobId && job.status === 'completed' && job.taskId)
    if (completed?.taskId) {
      setPendingJobId(null)
      onOpen(completed.taskId)
    }
  }, [jobs, pendingJobId, onOpen])
  async function generate() {
    setBusy(true)
    setError('')
    try {
      const input: Generation = { ...selection, skill, format, count, audioMode: 'monologue' }
      const job = await post<Job>('/generate', { ...input, requestId: crypto.randomUUID() })
      setPendingJobId(job.id)
      await onGenerated()
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {writingOnly ? 'TURN YOUR IDEAS INTO SOMETHING GOOD' : 'A CHALLENGE THAT MEETS YOU WHERE YOU ARE'}
          </div>
          <h1>{writingOnly ? 'Make your words count.' : 'Your practice. Your way.'}</h1>
          <p>
            {writingOnly
              ? 'Write, reflect, and find your voice with thoughtful feedback.'
              : 'Choose your focus. We’ll make something just for you.'}
          </p>
        </div>
      </div>
      <div className="practice-layout">
        <section className="panel generator-panel">
          <div className="section-heading compact">
            <h2>
              <Sparkles size={20} /> Create a fresh challenge
            </h2>
            <span className="badge">PERSONALISED</span>
          </div>
          <div className="form-step">
            <span className="step-number">01</span>
            <div>
              <h3>Set your level</h3>
              <p>Every stage brings a new kind of challenge.</p>
              <Filters catalog={catalog} value={selection} onChange={setSelection} />
            </div>
          </div>
          {!writingOnly && (
            <div className="form-step">
              <span className="step-number">02</span>
              <div className="grow">
                <h3>Find your focus</h3>
                <div className="skill-picker">
                  {catalog.skills
                    .filter((s) => s.id !== 'listening')
                    .map((s) => {
                      const Icon = skillIcons[s.id]
                      return (
                        <button
                          key={s.id}
                          className={skill === s.id ? 'selected' : ''}
                          onClick={() => {
                            setSkill(s.id)
                            setFormat(s.id === 'writing' ? 'essay' : 'mixed')
                          }}
                        >
                          <Icon size={21} />
                          <span>{s.label}</span>
                        </button>
                      )
                    })}
                </div>
              </div>
            </div>
          )}
          <div className="form-step">
            <span className="step-number">{writingOnly ? '02' : '03'}</span>
            <div className="grow">
              <h3>Make it yours</h3>
              <div className="form-grid">
                <label>
                  Task format
                  <select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
                    {skillInfo.formats.map((f) => (
                      <option key={f} value={f}>
                        {catalog.formats[f]}
                      </option>
                    ))}
                  </select>
                </label>
                {skill !== 'writing' && (
                  <label>
                    Practice length
                    <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                      <option value={10}>10 questions · A quick focus</option>
                      <option value={20}>20 questions · Go a little deeper</option>
                      <option value={30}>30 questions · The full challenge</option>
                    </select>
                  </label>
                )}
              </div>
            </div>
          </div>
          {selection.stage === 'national' && selection.grade === 9 && (
            <div className="notice">
              Class 9 national practice is adapted from Class 10 examples; no Class 9 national PDF was supplied.
            </div>
          )}
          {error && <ErrorNotice text={error} />}
          <button className="button primary generate-button" onClick={generate} disabled={busy || active}>
            {busy
              ? 'Saving your request…'
              : active
                ? 'Your current task is being prepared…'
                : skill === 'writing'
                  ? 'Create a writing prompt'
                  : 'Generate my practice'}
            <ArrowUpRight size={18} />
          </button>
          <p className="under-button">
            <Bookmark size={13} /> Automatically saved to your library. No daily limit for written practice.
          </p>
          {pendingJobId && (
            <p className="under-button" role="status">
              Your new task will open automatically when ready. If generation fails, use Resume below.
            </p>
          )}
        </section>
        <aside className="practice-aside">
          <div className="tip-card">
            <span className="tiny-spark">✦</span>
            <h3>A little intention goes a long way.</h3>
            <p>Choose one skill. Give it your attention. Use the feedback to decide what comes next.</p>
            <div className="tip-divider" />
            <strong>
              {skill === 'writing' ? 'Four perspectives on your writing' : 'More than a right or wrong answer'}
            </strong>
            <p>
              {skill === 'writing'
                ? 'Task response, coherence, vocabulary, and grammar — with evidence from your text and a score out of 40.'
                : 'See why an answer works, revisit the passage, and turn each mistake into your next small win.'}
            </p>
          </div>
          <div className="quiet-note">
            Listening task generation is under construction. Reading, Use of English, and writing are available.
          </div>
        </aside>
      </div>
      <div className="section-heading">
        <div>
          <h2>Your recent creations</h2>
          <p>Keep this tab open until generation finishes. Completed tasks are saved in this browser.</p>
        </div>
      </div>
      <div className="jobs-list">
        {jobs
          .filter((j) => j.kind !== 'audio')
          .slice(0, 6)
          .map((j) => (
            <JobCard key={j.id} job={j} onRetry={onRetry} onOpen={onOpen} />
          ))}
        {!jobs.some((j) => j.kind !== 'audio') && (
          <Empty title="Let curiosity lead">Your first challenge is just a few choices away.</Empty>
        )}
      </div>
    </>
  )
}
