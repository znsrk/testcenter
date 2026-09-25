import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Cloud,
  Headphones,
  Pause,
  RotateCcw,
  Send,
  XCircle,
} from 'lucide-react'
import { api, message, post, readLocal, time, writeLocal } from './api'
import { ErrorNotice, JobCard, skillLabels, Spinner, stageLabels } from './components'
import type { Attempt, Draft, Job, Result, Task, User } from './types'

type CachedDraft = Draft & { dirty: boolean }
export function TaskWorkspace({
  id,
  user,
  jobs,
  onBack,
  onRefresh,
  onRetry,
}: {
  id: string
  user: User
  jobs: Job[]
  onBack: () => void
  onRefresh: () => Promise<void>
  onRetry: (id: string) => void
}) {
  const [task, setTask] = useState<Task | null>(null)
  const [draft, setDraft] = useState<Draft>({ answers: {}, essay: '', seconds: 0, revision: 0 })
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [review, setReview] = useState(false)
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('All changes saved')
  const [busy, setBusy] = useState(false)
  const [recovery, setRecovery] = useState<CachedDraft | null>(null)
  const draftRef = useRef(draft)
  const taskRef = useRef<Task | null>(null)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const debounce = useRef<ReturnType<typeof setTimeout>>()
  const submissionId = useRef<string | null>(null)
  const dirty = useRef(false)
  const lastActivity = useRef(Date.now())
  const cacheKey = `testcenter:draft:${user.id}:${id}`
  const persistLocal = useCallback(
    (value: Draft, changed: boolean) => {
      if (!writeLocal(cacheKey, { ...value, dirty: changed }))
        setSaved('Local backup unavailable · keep this tab open until saved')
    },
    [cacheKey]
  )
  const save = useCallback(() => {
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (!dirty.current || !taskRef.current) return
        const snapshot = { ...draftRef.current }
        setSaved('Saving…')
        const { answers, essay, seconds, revision } = snapshot
        const result = await api<Draft>(`/tasks/${id}/draft`, {
          method: 'PUT',
          body: JSON.stringify({ answers, essay, seconds, revision }),
        })
        const changed =
          draftRef.current.answers !== snapshot.answers ||
          draftRef.current.essay !== snapshot.essay ||
          draftRef.current.seconds !== snapshot.seconds
        draftRef.current = { ...draftRef.current, revision: result.revision }
        setDraft(draftRef.current)
        dirty.current = changed
        persistLocal(draftRef.current, changed)
        setSaved(changed ? 'Changes waiting to save…' : 'All changes saved')
      })
    return queue.current
  }, [id, persistLocal])
  function change(patch: Partial<Draft>) {
    submissionId.current = null
    draftRef.current = { ...draftRef.current, ...patch }
    setDraft(draftRef.current)
    dirty.current = true
    persistLocal(draftRef.current, true)
    setSaved('Saving…')
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      save().catch((e) => {
        setSaved('Not synced · draft kept on this device')
        setError(message(e))
      })
    }, 650)
  }
  const load = useCallback(
    async (initial = false) => {
      try {
        const data = await api<Task>(`/tasks/${id}`)
        taskRef.current = data
        setTask(data)
        if (initial) {
          const cached = readLocal<CachedDraft>(cacheKey)
          let restored = data.draft
          if (cached?.dirty) {
            if (cached.revision === data.draft.revision) {
              restored = {
                answers: cached.answers,
                essay: cached.essay,
                seconds: cached.seconds,
                revision: cached.revision,
              }
              dirty.current = true
              setSaved('Restored from this device · syncing…')
            } else if (
              JSON.stringify(cached.answers) !== JSON.stringify(data.draft.answers) ||
              cached.essay !== data.draft.essay
            )
              setRecovery(cached)
          }
          draftRef.current = restored
          setDraft(restored)
          const latest = data.attempts[0] || null
          setAttempt(latest)
          setReview(
            Boolean(
              latest?.status === 'completed' &&
              !cached?.dirty &&
              (!data.draft.updatedAt || data.draft.updatedAt <= latest.created_at)
            )
          )
        } else {
          setAttempt((previous) => data.attempts.find((a) => a.id === previous?.id) || data.attempts[0] || null)
        }
      } catch (e) {
        setError(message(e))
      }
    },
    [id, cacheKey]
  )
  useEffect(() => {
    load(true)
    return () => {
      clearTimeout(debounce.current)
      save().catch(() => {})
    }
  }, [load, save])
  useEffect(() => {
    if (!task) return
    const saveTimer = setInterval(() => {
      save().catch((e) => {
        setSaved('Not synced · draft kept on this device')
        setError(message(e))
      })
    }, 10_000)
    const hidden = () => {
      if (document.visibilityState === 'hidden') save().catch(() => {})
    }
    document.addEventListener('visibilitychange', hidden)
    const activity = () => {
      lastActivity.current = Date.now()
    }
    window.addEventListener('pointerdown', activity)
    window.addEventListener('keydown', activity)
    window.addEventListener('scroll', activity, true)
    return () => {
      clearInterval(saveTimer)
      document.removeEventListener('visibilitychange', hidden)
      window.removeEventListener('pointerdown', activity)
      window.removeEventListener('keydown', activity)
      window.removeEventListener('scroll', activity, true)
    }
  }, [Boolean(task), save])
  useEffect(() => {
    if (!task || review || paused || busy || attempt?.status === 'grading') return
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible' || !document.hasFocus() || Date.now() - lastActivity.current > 120_000)
        return
      draftRef.current = { ...draftRef.current, seconds: draftRef.current.seconds + 1 }
      dirty.current = true
      setDraft(draftRef.current)
      persistLocal(draftRef.current, true)
    }, 1000)
    return () => clearInterval(timer)
  }, [Boolean(task), review, paused, busy, attempt?.status, persistLocal])
  useEffect(() => {
    if (attempt?.status !== 'grading' && attempt?.status !== 'failed') return
    const updated = jobs.find((j) => j.attemptId === attempt.id)
    if (updated?.status === 'completed') {
      load()
      setReview(true)
    } else if (updated?.status === 'failed' && attempt.status !== 'failed') load()
  }, [jobs, attempt, load])
  async function submit() {
    setBusy(true)
    setError('')
    clearTimeout(debounce.current)
    try {
      await save()
      submissionId.current ||= crypto.randomUUID()
      const { answers, essay, seconds, revision } = draftRef.current
      const response = await post<{ attempt: Attempt }>(`/tasks/${id}/submit`, {
        answers,
        essay,
        seconds,
        revision,
        requestId: submissionId.current,
      })
      dirty.current = false
      // The submission also saves the draft and advances its revision.
      const fresh = await api<Task>(`/tasks/${id}`)
      taskRef.current = fresh
      setTask(fresh)
      draftRef.current = fresh.draft
      setDraft(fresh.draft)
      persistLocal(fresh.draft, false)
      setAttempt(response.attempt)
      setReview(response.attempt.status === 'completed')
      setSaved('Submission saved')
      await onRefresh()
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }
  async function leave() {
    await save().catch(() => {})
    onBack()
  }
  if (!task)
    return error ? (
      <ErrorNotice text={error} onRetry={() => load(true)} />
    ) : (
      <Spinner label="Opening your saved practice…" />
    )
  const writing = task.skill === 'writing'
  const gradingJob = jobs.find((j) => j.attemptId === attempt?.id)
  const answered = task.questions.filter((q) => draft.answers[q.id]?.trim()).length
  const countWords = draft.essay.trim().split(/\s+/u).filter(Boolean).length
  const reviewing = review && attempt?.result
  const currentAttemptSeconds = Math.max(0, draft.seconds - task.attempts.reduce((total, a) => total + a.seconds, 0))
  return (
    <>
      <button className="text-button back-link" onClick={leave}>
        <ArrowLeft size={16} /> Back to your library
      </button>
      <div className="task-heading">
        <div>
          <div className="eyebrow">
            {skillLabels[task.skill]} <span>·</span> CLASS {task.grade} <span>·</span> {stageLabels[task.stage]} ROUND
          </div>
          <h1>{task.title}</h1>
          <p>{task.instructions}</p>
        </div>
        <span className="badge">{task.maxScore} POINTS</span>
      </div>
      <div className="workspace-toolbar">
        <span className="row">
          <Cloud size={16} />
          <span role="status">{saved}</span>
        </span>
        <div className="row">
          <span className="timer">
            <Clock3 size={16} />
            {time(reviewing ? attempt.seconds : currentAttemptSeconds)}
          </span>
          {!reviewing && (
            <button
              className="text-button"
              onClick={() => {
                setPaused(!paused)
                lastActivity.current = Date.now()
              }}
            >
              {paused ? (
                'Resume'
              ) : (
                <>
                  <Pause size={13} /> Pause
                </>
              )}
            </button>
          )}
          <span className="muted small">{task.suggestedMinutes} min suggested</span>
        </div>
      </div>
      {error && <ErrorNotice text={error} />}
      {recovery && (
        <div className="notice">
          <div>A different unsynced draft was found on this device. The newer saved draft is shown below.</div>
          <button
            className="button small"
            onClick={() => {
              change({
                answers: recovery.answers,
                essay: recovery.essay,
                seconds: Math.max(recovery.seconds, draft.seconds),
              })
              setRecovery(null)
            }}
          >
            Restore this device’s draft
          </button>
          <button
            className="text-button"
            onClick={() => {
              persistLocal(draftRef.current, dirty.current)
              setRecovery(null)
            }}
          >
            Keep saved draft
          </button>
        </div>
      )}
      {task.profile.adapted && (
        <div className="reference-note">
          Adapted practice · this exact class, stage or format is not present in the supplied examples.
        </div>
      )}
      {attempt?.status === 'grading' || (attempt?.status === 'failed' && gradingJob) ? (
        <JobCard
          job={
            gradingJob || {
              id: '',
              kind: 'essay',
              status: 'queued',
              options: {},
              progress: 0,
              retries: 0,
              taskId: id,
              attemptId: attempt.id,
              error: null,
              createdAt: '',
            }
          }
          onRetry={onRetry}
          onOpen={() => load()}
        />
      ) : null}
      {task.attempts.length > 0 && (
        <div className="attempt-bar">
          <label>
            Saved attempts
            <select
              aria-label="Saved attempts"
              value={review ? attempt?.id || '' : ''}
              onChange={(e) => {
                if (!e.target.value) {
                  setReview(false)
                  return
                }
                const selected = task.attempts.find((a) => a.id === e.target.value)!
                setAttempt(selected)
                setReview(true)
              }}
            >
              {!review && <option value="">Current draft</option>}
              {task.attempts.map((a, i) => (
                <option key={a.id} value={a.id}>
                  Attempt {task.attempts.length - i} · {a.result ? `${a.result.score}/${a.result.maxScore}` : a.status}{' '}
                  · {new Date(a.created_at).toLocaleString()}
                </option>
              ))}
            </select>
          </label>
          {review && (
            <button
              className="text-button"
              onClick={() => {
                setReview(false)
                lastActivity.current = Date.now()
              }}
            >
              <RotateCcw size={14} /> Return to draft
            </button>
          )}
        </div>
      )}
      {reviewing && <ResultOverview result={attempt.result!} seconds={attempt.seconds} />}
      {task.audioUrl && (
        <section className="audio-panel">
          <div className="row">
            <div className="skill-symbol listening">
              <Headphones size={26} />
            </div>
            <div>
              <h3>Settle in. Listen closely.</h3>
              <p>{Math.round((task.duration || 0) / 60)} minute recording · AI-generated voices</p>
            </div>
          </div>
          <audio
            controls
            preload="metadata"
            src={task.audioUrl}
            onPlay={() => {
              setPaused(false)
              lastActivity.current = Date.now()
            }}
            onTimeUpdate={() => {
              lastActivity.current = Date.now()
            }}
          >
            Your browser does not support audio playback.
          </audio>
          <p className="small muted">
            You can listen again whenever you need. Open the transcript below at any time.
          </p>
        </section>
      )}
      {task.segments.length > 0 && (
        <details className="panel transcript">
          <summary>Recording transcript</summary>
          {task.segments.map((segment, index) => (
            <div key={index}>
              <strong>Speaker {segment.speaker}</strong>
              <p>{segment.text}</p>
            </div>
          ))}
        </details>
      )}
      <div className={`task-layout ${writing ? 'writing-layout' : ''}`}>
        <div className="task-main">
          {task.passage && (
            <article className="panel passage">
              <div className="eyebrow">READ AT YOUR OWN PACE</div>
              <h2>The passage</h2>
              <div className="prose">{task.passage}</div>
            </article>
          )}
          {writing ? (
            <>
              <section className="panel writing-prompt">
                <span className="eyebrow">YOUR WRITING PROMPT</span>
                <div className="prose">{task.writingPrompt}</div>
                <div className="row">
                  <span className="badge">
                    {task.minWords}–{task.maxWords} words
                  </span>
                  <span className="small muted">Feedback across four IELTS criteria</span>
                </div>
              </section>
              {reviewing ? (
                <>
                  <div className="panel">
                    <h3>Your submitted writing</h3>
                    <div className="prose submitted-essay">{attempt.essay}</div>
                  </div>
                  <EssayFeedback result={attempt.result!} />
                </>
              ) : (
                <section className="panel essay-editor">
                  <div className="section-heading compact">
                    <h3>A space for your ideas</h3>
                    <span
                      className={
                        countWords >= task.minWords && countWords <= task.maxWords
                          ? 'word-count in-range'
                          : 'word-count'
                      }
                    >
                      {countWords} words
                    </span>
                  </div>
                  <label className="sr-only" htmlFor="essay">
                    Your writing
                  </label>
                  <textarea
                    id="essay"
                    placeholder="Your first sentence is a good place to start…"
                    value={draft.essay}
                    onChange={(e) => change({ essay: e.target.value })}
                    disabled={busy || attempt?.status === 'grading'}
                    maxLength={18000}
                  />
                  <div className="editor-footer">
                    <span>
                      {task.minWords}–{task.maxWords} words suggested
                    </span>
                    <span>Every idea is saved as you write.</span>
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="questions">
              {task.questions.map((q, index) => {
                const feedback = reviewing ? attempt.result!.questions?.find((r) => r.id === q.id) : null
                const answer = reviewing ? attempt.answers[q.id] || '' : draft.answers[q.id] || ''
                return (
                  <section
                    className={`panel question ${feedback ? (feedback.correct ? 'answered-correct' : 'answered-incorrect') : ''}`}
                    key={q.id}
                    id={q.id}
                  >
                    <div className="question-top">
                      <span className="question-number">{String(index + 1).padStart(2, '0')}</span>
                      <span className="eyebrow">{q.type.replace('_', ' ')}</span>
                      <span className="question-points">
                        {feedback ? `${feedback.score}/` : ''}
                        {q.points} {q.points === 1 ? 'point' : 'points'}
                      </span>
                    </div>
                    <fieldset disabled={Boolean(reviewing) || busy}>
                      <legend>{q.text}</legend>
                      {q.type === 'gap_fill' ? (
                        <label className="gap-label">
                          <span>Write the missing part · maximum {q.maxWords} words</span>
                          <input
                            aria-label={`Answer to question ${index + 1}`}
                            value={answer}
                            placeholder="Your answer…"
                            onChange={(e) => change({ answers: { ...draft.answers, [q.id]: e.target.value } })}
                            maxLength={3000}
                            autoComplete="off"
                          />
                        </label>
                      ) : (
                        <div className="answer-options">
                          {q.choices.map((choice, choiceIndex) => (
                            <label
                              key={choice}
                              className={`answer-option ${answer === choice ? 'chosen' : ''} ${feedback?.correctAnswer === choice ? 'is-correct' : ''}`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={choice}
                                checked={answer === choice}
                                onChange={() => change({ answers: { ...draft.answers, [q.id]: choice } })}
                              />
                              <span className="option-letter">{String.fromCharCode(65 + choiceIndex)}</span>
                              <span>{choice}</span>
                              {answer === choice && <Check size={16} />}
                            </label>
                          ))}
                        </div>
                      )}
                    </fieldset>
                    {feedback && (
                      <div className={`answer-feedback ${feedback.correct ? 'correct' : 'incorrect'}`}>
                        <div className="row">
                          {feedback.correct ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                          <strong>
                            {feedback.correct ? 'Nicely done.' : `Correct answer: ${feedback.correctAnswer}`}
                          </strong>
                        </div>
                        <p>{feedback.explanation}</p>
                        {feedback.evidence && <blockquote>{feedback.evidence}</blockquote>}
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          )}
          {!reviewing && (
            <div className="submit-panel">
              <div>
                <strong>
                  {writing
                    ? 'Ready for a fresh perspective?'
                    : answered === task.questions.length
                      ? 'You’ve made it through. Nice work.'
                      : `${answered} of ${task.questions.length} questions answered`}
                </strong>
                <p>
                  {writing
                    ? 'Your response is saved before the assessment begins.'
                    : 'Submit when you’re ready. Unanswered questions receive zero points.'}
                </p>
              </div>
              <button
                className="button primary"
                disabled={busy || attempt?.status === 'grading' || (writing && !draft.essay.trim())}
                onClick={submit}
              >
                {busy ? 'Saving your work…' : writing ? 'Get writing feedback' : 'Finish & see feedback'}
                {writing ? <Send size={16} /> : <ArrowRight size={16} />}
              </button>
            </div>
          )}
        </div>
        <aside className="task-aside">
          <div className="panel sticky-card">
            <span className="eyebrow">YOUR PRACTICE</span>
            <h3>{writing ? 'Make space for a good draft.' : 'One question at a time.'}</h3>
            {!writing && (
              <>
                <div className="question-nav">
                  {task.questions.map((q, i) => (
                    <a
                      key={q.id}
                      href={`#${q.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        document.getElementById(q.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }}
                      className={draft.answers[q.id]?.trim() ? 'done' : ''}
                      aria-label={`Go to question ${i + 1}`}
                    >
                      {i + 1}
                    </a>
                  ))}
                </div>
                <div className="progress-track">
                  <div style={{ width: `${(answered / task.questions.length) * 100}%` }} />
                </div>
                <p className="small muted">
                  {answered}/{task.questions.length} answered
                </p>
              </>
            )}
            <div className="tip-divider" />
            <p>
              {writing
                ? 'Plan your ideas. Develop your examples. Leave a moment to read it back.'
                : 'Take your time, trust what you know, and come back to anything that needs another look.'}
            </p>
            <div className="small muted">
              Your timer pauses when this page is hidden or inactive. Progress is saved only in this browser.
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}

function ResultOverview({ result, seconds }: { result: Result; seconds: number }) {
  return (
    <section className="result-banner">
      <div
        className="score-ring"
        style={{ '--score': `${(result.score / result.maxScore) * 100}%` } as React.CSSProperties}
      >
        <div>
          <strong>{result.score}</strong>
          <span>out of {result.maxScore}</span>
        </div>
      </div>
      <div className="grow">
        <div className="eyebrow">ANOTHER STEP FORWARD</div>
        <h2>
          {result.score / result.maxScore >= 0.8
            ? 'You’re building something good.'
            : 'Every attempt teaches you something.'}
        </h2>
        <p>
          {result.summary ||
            'Take a moment to explore the explanations below. That’s where the next bit of progress begins.'}
        </p>
        <span className="result-time">
          <Clock3 size={14} /> {time(seconds)} of focused practice
          {result.band !== undefined && ` · Estimated band ${result.band.toFixed(1)}`}
        </span>
      </div>
      <CheckCircle2 className="result-check" size={31} />
    </section>
  )
}
function EssayFeedback({ result }: { result: Result }) {
  return (
    <div className="essay-feedback">
      <div className="section-heading">
        <h2>Four ways to grow</h2>
        <span className="badge">{result.wordCount} WORDS</span>
      </div>
      <div className="criteria-grid">
        {result.criteria?.map((c) => (
          <section className="panel criterion" key={c.key}>
            <div className="row">
              <h3>{c.label}</h3>
              <span className="criterion-score">
                {c.score}
                <small>/10</small>
              </span>
            </div>
            <div className="progress-track">
              <div style={{ width: `${(c.band / 9) * 100}%` }} />
            </div>
            <span className="small muted">Criterion band {c.band.toFixed(1)} / 9</span>
            <p>{c.feedback}</p>
            {c.evidence && <blockquote>“{c.evidence}”</blockquote>}
            <div className="next-step">
              <strong>Your next step</strong>
              <p>{c.nextStep}</p>
            </div>
          </section>
        ))}
      </div>
      <div className="feedback-two-col">
        <section className="panel">
          <h3>Keep doing this</h3>
          <ul>
            {result.strengths?.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h3>Try this next</h3>
          <ul>
            {result.improvements?.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      </div>
      {Boolean(result.corrections?.length) && (
        <section className="panel corrections">
          <h3>A closer look at your sentences</h3>
          {result.corrections?.map((c, i) => (
            <div className="correction" key={i}>
              <div className="before">{c.original}</div>
              <div className="after">
                <ArrowRight size={15} />
                {c.improved}
              </div>
              <p>{c.explanation}</p>
            </div>
          ))}
        </section>
      )}
      <div className="assessment-note">
        {result.note} Score calculation: mean of the four criterion bands ÷ 9 × 40, rounded to one decimal.
      </div>
    </div>
  )
}
