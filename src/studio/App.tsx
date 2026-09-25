import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  Eye,
  EyeOff,
  Headphones,
  KeyRound,
  LayoutDashboard,
  Library,
  LockKeyhole,
  LogOut,
  Menu,
  PenLine,
  Sparkles,
  X,
} from 'lucide-react'
import { api, ApiError, message, post, readLocal, writeLocal } from './api'
import type { Catalog, Job, Selection, TaskSummary, User } from './types'
import { Empty, ErrorNotice, Filters, JobCard, Logo, skillIcons, Spinner, TaskCard } from './components'
import { Practice } from './Practice'
import { TaskWorkspace } from './TaskWorkspace'
import { ListeningRoom } from './ListeningRoom'

const currentRoute = () => window.location.hash.slice(1) || 'overview'
const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'practice', label: 'Practice studio', icon: Sparkles },
  { id: 'library', label: 'My library', icon: Library },
  { id: 'listening', label: 'Listening room', icon: Headphones },
  { id: 'writing', label: 'Writing desk', icon: PenLine },
  { id: 'progress', label: 'My progress', icon: ChartNoAxesCombined },
]

function Login({ onLogin, initialError }: { onLogin: (user: User) => void; initialError: string }) {
  const [code, setCode] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(initialError)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await post<{ user: User }>('/login', { code: code.trim() })
      setCode('')
      onLogin(result.user)
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="login-page">
      <div className="login-story">
        <Logo />
        <div className="login-story-copy">
          <span className="pill light">
            <span className="status-dot" /> A little practice, every day
          </span>
          <h1>
            Big ambitions.
            <br />
            Your kind of
            <br />
            <em>practice.</em>
          </h1>
          <p>A space to build your English, find your confidence, and make the next olympiad your own.</p>
          <div className="login-features">
            <span>
              <Check size={16} /> Made for classes 9–11
            </span>
            <span>
              <Check size={16} /> Personal feedback
            </span>
            <span>
              <Check size={16} /> Progress that stays with you
            </span>
          </div>
        </div>
        <div className="orbit-art" aria-hidden="true">
          <div className="orbit o1" />
          <div className="orbit o2" />
          <div className="orbit-core">
            <Sparkles size={54} />
          </div>
          <div className="floating-chip chip-a">
            <Headphones size={20} />
          </div>
          <div className="floating-chip chip-b">
            <PenLine size={20} />
          </div>
        </div>
        <div className="login-footer">
          ENGLISH OLYMPIAD PREPARATION <span>ONE STEP FURTHER ↗</span>
        </div>
      </div>
      <div className="login-form-side">
        <span className="eyebrow login-top">YOUR SPACE TO GROW</span>
        <div className="login-form">
          <div className="login-key">
            <KeyRound size={27} />
          </div>
          <h2>
            Welcome to your
            <br />
            next chapter.
          </h2>
          <p>
            One code. Your own practice space.
            <br />
            Pick up right where you left off.
          </p>
          <form onSubmit={submit}>
            <label htmlFor="access-code">Your access code</label>
            <div className="code-input">
              <input
                id="access-code"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                type={visible ? 'text' : 'password'}
                placeholder="Enter the code from your teacher"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                maxLength={200}
              />
              <button
                type="button"
                aria-label={visible ? 'Hide code' : 'Show code'}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <ErrorNotice text={error} />}
            <button className="button primary login-submit" disabled={busy || !code.trim()}>
              {busy ? 'Opening your space…' : 'Let’s get started'}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="login-note">
            <LockKeyhole size={16} />
            <span>
              No signup or personal details. Your work stays in this browser; clearing its site data removes it.
            </span>
          </div>
        </div>
        <div className="login-bottom">A focused mind. A world of possibility.</div>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [tasks, setTasks] = useState<TaskSummary[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [route, setRoute] = useState(currentRoute)
  const [mobile, setMobile] = useState(false)
  const [error, setError] = useState('')
  const [selection, setSelection] = useState<Selection>(() => {
    const saved = readLocal<Selection>('testcenter:selection')
    return saved &&
      [9, 10, 11].includes(saved.grade) &&
      ['starter', 'district', 'regional', 'national'].includes(saved.stage)
      ? saved
      : { grade: 9, stage: 'regional' }
  })
  function navigate(to: string) {
    window.location.hash = to
    setMobile(false)
  }
  const refresh = useCallback(async () => {
    if (!user) return
    try {
      const [t, j] = await Promise.all([api<TaskSummary[]>('/tasks'), api<Job[]>('/jobs')])
      setTasks(t)
      setJobs(j)
      setError('')
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setUser(null)
      else setError(message(e))
    }
  }, [user])
  useEffect(() => {
    api<{ user: User }>('/session')
      .then((r) => setUser(r.user))
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) setError(message(e))
      })
      .finally(() => setChecking(false))
    const handler = () => setRoute(currentRoute())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])
  useEffect(() => {
    if (!user) {
      setCatalog(null)
      setTasks([])
      setJobs([])
      return
    }
    api<Catalog>('/catalog')
      .then(setCatalog)
      .catch((e) => setError(message(e)))
    refresh()
    const timer = setInterval(refresh, 6000)
    return () => clearInterval(timer)
  }, [user, refresh])
  useEffect(() => {
    writeLocal('testcenter:selection', selection)
  }, [selection])
  async function retry(id: string) {
    try {
      await post(`/jobs/${id}/retry`)
      await refresh()
    } catch (e) {
      setError(message(e))
    }
  }
  async function logout() {
    try {
      await post('/logout')
      setUser(null)
      setError('')
      navigate('overview')
    } catch (e) {
      setError(message(e))
    }
  }
  const open = (id: string) => navigate(`task/${id}`)
  if (checking)
    return (
      <div className="boot">
        <Logo />
        <Spinner />
      </div>
    )
  if (!user)
    return (
      <Login
        initialError={error}
        onLogin={(value) => {
          setUser(value)
          setError('')
        }}
      />
    )
  if (!catalog)
    return (
      <div className="boot">
        <Logo />
        {error ? <ErrorNotice text={error} onRetry={() => window.location.reload()} /> : <Spinner />}
      </div>
    )
  const visibleTasks = tasks.filter((t) => t.grade === selection.grade && t.stage === selection.stage)
  const personal = tasks.filter((t) => !t.shared)
  const completed = tasks.filter((t) => t.result)
  const minutes = Math.round(tasks.reduce((total, t) => total + t.seconds, 0) / 60)
  const average = completed.length
    ? Math.round(completed.reduce((s, t) => s + (t.result!.score / t.result!.maxScore) * 100, 0) / completed.length)
    : 0
  const pending = jobs.filter((j) => j.status !== 'completed' && (j.kind !== 'audio' || user.role === 'student'))
  const title = route.startsWith('task/')
    ? 'Your practice space'
    : navigation.find((n) => n.id === route)?.label || 'Overview'
  return (
    <div className="app-shell">
      {mobile && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}
      <aside className={`sidebar ${mobile ? 'is-open' : ''}`}>
        <a href="#overview" className="brand-link">
          <Logo />
        </a>
        <button className="mobile-close icon-button" onClick={() => setMobile(false)} aria-label="Close navigation">
          <X size={20} />
        </button>
        <div className="sidebar-section-label">YOUR WORKSPACE</div>
        <nav>
          {navigation.map((n) => (
            <a
              href={`#${n.id}`}
              key={n.id}
              onClick={() => setMobile(false)}
              className={route === n.id ? 'active' : ''}
              aria-current={route === n.id ? 'page' : undefined}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.id === 'library' && personal.length > 0 && <span className="nav-count">{personal.length}</span>}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="small-manifesto">
            <span className="tiny-spark">✦</span>
            <strong>Progress, not perfection.</strong>
            <p>
              Small steps today.
              <br />
              More confidence tomorrow.
            </p>
          </div>
          <div className="profile-row">
            <div className="profile-avatar">{user.role === 'admin' ? 'A' : 'S'}</div>
            <div>
              <strong>{user.role === 'admin' ? 'Administrator' : 'My workspace'}</strong>
              <span>{user.role === 'admin' ? 'Master access' : 'Your progress is saved'}</span>
            </div>
            <button className="icon-button" title="Sign out" aria-label="Sign out" onClick={logout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="row">
            <button className="icon-button mobile-menu" onClick={() => setMobile(true)} aria-label="Open navigation">
              <Menu size={22} />
            </button>
            <span className="topbar-breadcrumb">
              Workspace <span>/</span> <strong>{title}</strong>
            </span>
          </div>
          <span className="saved-chip">
            <span className="status-dot" /> Your personal learning space
          </span>
        </header>
        <main className="main-content" id="main-content">
          {error && <ErrorNotice text={error} onRetry={refresh} />}
          {route.startsWith('task/') ? (
            <TaskWorkspace
              key={route}
              id={route.slice(5)}
              user={user}
              jobs={jobs}
              onBack={() => navigate('library')}
              onRefresh={refresh}
              onRetry={retry}
            />
          ) : route === 'listening' ? (
            <ListeningRoom
              catalog={catalog}
              selection={selection}
              setSelection={setSelection}
              tasks={tasks}
              onOpen={open}
            />
          ) : route === 'practice' || route === 'writing' ? (
            <Practice
              key={route}
              catalog={catalog}
              selection={selection}
              setSelection={setSelection}
              writingOnly={route === 'writing'}
              jobs={jobs}
              onGenerated={refresh}
              onOpen={open}
              onRetry={retry}
            />
          ) : route === 'overview' ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">A NEW DAY TO GET BETTER</div>
                  <h1>
                    Make room for progress<span className="purple">.</span>
                  </h1>
                  <p>Your goals, your pace. Let’s make today count.</p>
                </div>
                <Filters catalog={catalog} value={selection} onChange={setSelection} />
              </div>
              <section className="hero-panel">
                <div className="hero-copy">
                  <span className="pill">
                    <Sparkles size={13} /> YOUR NEXT CHAPTER
                  </span>
                  <h2>
                    A little practice.
                    <br />A lot of possibility.
                  </h2>
                  <p>
                    Fresh challenges made for your class and olympiad stage.
                    <br className="desktop-break" /> Build your skills, one small win at a time.
                  </p>
                  <button className="button dark" onClick={() => navigate('practice')}>
                    Create a practice task <ArrowUpRight size={18} />
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="hero-orbit orbit-one" />
                  <div className="hero-orbit orbit-two" />
                  <div className="hero-book">
                    <BookOpen size={85} strokeWidth={1.2} />
                    <span>
                      YOUR NEXT
                      <br />
                      <b>breakthrough.</b>
                    </span>
                  </div>
                  <div className="art-star star-one">✦</div>
                  <div className="art-star star-two">✧</div>
                  <div className="hero-float">
                    <Check size={16} /> One step further
                  </div>
                </div>
              </section>
              <div className="stats-grid">
                <Stat
                  icon={Library}
                  value={String(personal.length)}
                  label="Tasks in your library"
                  note="Always here when you return"
                />
                <Stat
                  icon={Check}
                  value={String(completed.length)}
                  label="Tasks completed"
                  note="Every finish is a step forward"
                />
                <Stat
                  icon={ChartNoAxesCombined}
                  value={completed.length ? `${average}%` : '—'}
                  label="Average latest score"
                  note="A snapshot of your progress"
                />
                <Stat
                  icon={BookOpen}
                  value={`${minutes} min`}
                  label="Focused practice"
                  note="Time invested in yourself"
                />
              </div>
              <div className="section-heading">
                <div>
                  <h2>What will you work on?</h2>
                  <p>A balanced practice makes a confident learner.</p>
                </div>
                <span className="muted small">FOUR SKILLS. MORE POSSIBILITIES.</span>
              </div>
              <div className="skill-grid">
                {catalog.skills.map((skill) => {
                  const Icon = skillIcons[skill.id]
                  return (
                    <button
                      className={`skill-card ${skill.id}`}
                      key={skill.id}
                      onClick={() =>
                        navigate(
                          skill.id === 'listening'
                            ? 'listening'
                            : skill.id === 'writing'
                              ? 'writing'
                              : `practice?skill=${skill.id}`
                        )
                      }
                    >
                      <div className="row">
                        <span className={`skill-symbol ${skill.id}`}>
                          <Icon size={24} />
                        </span>
                        <ArrowUpRight size={18} />
                      </div>
                      <h3>{skill.label}</h3>
                      <p>{skill.description}</p>
                      <span className="skill-card-link">
                        {skill.id === 'listening' ? 'Under construction' : 'Start practising'} <ArrowRight size={14} />
                      </span>
                    </button>
                  )
                })}
              </div>
              {pending.length > 0 && (
                <div className="section-block">
                  {pending.map((j) => (
                    <JobCard key={j.id} job={j} onRetry={retry} onOpen={open} />
                  ))}
                </div>
              )}
              <div className="section-heading">
                <div>
                  <h2>Pick up where you left off</h2>
                  <p>Your saved tasks for this class and stage.</p>
                </div>
                <button className="text-button" onClick={() => navigate('library')}>
                  View library <ArrowRight size={15} />
                </button>
              </div>
              <div className="task-list">
                {visibleTasks.length ? (
                  visibleTasks.slice(0, 4).map((t) => <TaskCard key={t.id} task={t} onOpen={open} />)
                ) : (
                  <Empty
                    title="Your next chapter starts here"
                    action={{ label: 'Create your first task', run: () => navigate('practice') }}
                  >
                    Choose a skill to create your first personalised practice. We’ll keep it here for you.
                  </Empty>
                )}
              </div>
            </>
          ) : route.startsWith('practice?') ? (
            <Practice
              key={route}
              initialSkill={route.split('=')[1] === 'reading' ? 'reading' : 'grammar'}
              catalog={catalog}
              selection={selection}
              setSelection={setSelection}
              jobs={jobs}
              onGenerated={refresh}
              onOpen={open}
              onRetry={retry}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {route === 'progress'
                        ? 'LOOK HOW FAR YOU’VE COME'
                        : 'A LITTLE COLLECTION OF POSSIBILITY'}
                  </div>
                  <h1>
                    {route === 'progress'
                        ? 'Every step counts.'
                        : 'Your practice, kept safe.'}
                  </h1>
                  <p>
                    {route === 'progress'
                        ? 'Revisit your feedback and see what to work on next.'
                        : 'Everything you’ve created, ready whenever you are.'}
                  </p>
                </div>
                <Filters catalog={catalog} value={selection} onChange={setSelection} />
              </div>
              {route === 'progress' && (
                <div className="stats-grid">
                  <Stat
                    icon={Check}
                    value={String(completed.length)}
                    label="Completed tasks"
                    note="Across all classes and stages"
                  />
                  <Stat
                    icon={ChartNoAxesCombined}
                    value={completed.length ? `${average}%` : '—'}
                    label="Average latest score"
                    note="Your latest attempt per task"
                  />
                  <Stat
                    icon={BookOpen}
                    value={`${minutes} min`}
                    label="Practice time"
                    note="Active time, saved with your drafts"
                  />
                </div>
              )}
              <div className="task-list">
                {visibleTasks
                  .filter((t) =>
                    route === 'progress' ? t.result : !t.shared || t.started
                  )
                  .map((t) => (
                    <TaskCard key={t.id} task={t} onOpen={open} />
                  ))}
                {!visibleTasks.some((t) =>
                  route === 'progress' ? t.result : !t.shared || t.started
                ) && (
                  <Empty
                    icon={Library}
                    title={
                      route === 'progress'
                          ? 'Your progress starts with one task'
                          : 'A fresh page, just for you'
                    }
                    action={{ label: 'Explore practice', run: () => navigate('practice') }}
                  >
                    Your saved work and feedback will appear here. You can also change the class and stage above.
                  </Empty>
                )}
              </div>
            </>
          )}
        </main>
        <footer className="workspace-footer">
          <span>
            testcenter. <span className="muted">A little better, every day.</span>
          </span>
          <span>Made for your next step ↗</span>
        </footer>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  value,
  label,
  note,
}: {
  icon: typeof BookOpen
  value: string
  label: string
  note: string
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <Icon size={17} />
      </div>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  )
}
