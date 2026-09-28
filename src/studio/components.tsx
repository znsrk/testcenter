import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Headphones,
  Layers3,
  LoaderCircle,
  PenLine,
  Sparkles,
} from 'lucide-react'
import type { Catalog, Job, Selection, Skill, TaskSummary } from './types'
import { date } from './api'

export const skillIcons = { grammar: Layers3, reading: BookOpen, writing: PenLine, listening: Headphones }
export const skillLabels: Record<Skill, string> = {
  grammar: 'Use of English',
  reading: 'Reading',
  writing: 'Writing',
  listening: 'Listening',
}
export const stageLabels = { starter: 'Starting', district: 'District', regional: 'Regional', national: 'National' }
export function Logo() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <BookOpen size={23} strokeWidth={2.2} />
      </span>
      testcenter<span className="brand-dot">.</span>
    </span>
  )
}
export function Spinner({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>{label}</span>
    </div>
  )
}
export function ErrorNotice({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="notice error" role="alert">
      <span>{text}</span>
      {onRetry && (
        <button className="text-button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
export function Filters({
  catalog,
  value,
  onChange,
}: {
  catalog: Catalog
  value: Selection
  onChange: (value: Selection) => void
}) {
  return (
    <div className="filters">
      <label>
        <span>Class</span>
        <select
          aria-label="Class"
          value={value.grade}
          onChange={(e) => {
            const grade = Number(e.target.value)
            onChange({ grade, stage: grade === 9 && value.stage === 'national' ? 'regional' : value.stage })
          }}
        >
          {catalog.grades.map((g) => (
            <option key={g} value={g}>
              Class {g}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Olympiad stage</span>
        <select
          aria-label="Olympiad stage"
          value={value.stage}
          onChange={(e) => onChange({ ...value, stage: e.target.value as Selection['stage'] })}
        >
          {catalog.stages.map((s) => (
            <option key={s.id} value={s.id} disabled={value.grade === 9 && s.id === 'national'}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
export function TaskCard({ task, onOpen }: { task: TaskSummary; onOpen: (id: string) => void }) {
  const Icon = skillIcons[task.skill]
  return (
    <button className="task-card" onClick={() => onOpen(task.id)}>
      <div className={`skill-symbol ${task.skill}`}>
        <Icon size={22} />
      </div>
      <div className="task-card-main">
        <div className="eyebrow">
          {skillLabels[task.skill]} <span>·</span> Class {task.grade} <span>·</span> {stageLabels[task.stage]}
        </div>
        <h3>{task.title}</h3>
        <div className="task-meta">
          <span>
            <Clock3 size={13} />{' '}
            {task.duration ? `${Math.round(task.duration / 60)} min audio` : `${task.suggestedMinutes} min practice`}
          </span>
          <span>{task.maxScore} points</span>
          <span>{date(task.createdAt)}</span>
        </div>
      </div>
      <div className="task-card-end">
        {task.result ? (
          <span className="badge complete">
            <Check size={12} /> {task.result.score}/{task.result.maxScore}
          </span>
        ) : task.started ? (
          <span className="badge amber">In progress</span>
        ) : (
          <span className="badge">{task.shared ? 'Shared' : 'Ready'}</span>
        )}
        <ChevronRight size={20} />
      </div>
    </button>
  )
}
export function Empty({
  icon: Icon = BookOpen,
  title,
  children,
  action,
}: {
  icon?: typeof BookOpen
  title: string
  children: React.ReactNode
  action?: { label: string; run: () => void }
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={29} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action && (
        <button className="button primary" onClick={action.run}>
          {action.label}
          <ArrowUpRight size={16} />
        </button>
      )}
    </div>
  )
}
export function JobCard({
  job,
  onRetry,
  onOpen,
}: {
  job: Job
  onRetry: (id: string) => void
  onOpen: (id: string) => void
}) {
  const busy = job.status === 'running' || job.status === 'queued'
  return (
    <div className={`job-card ${job.status}`} data-job-id={job.id}>
      <div className="row">
        <span className="job-icon">
          {busy ? (
            <LoaderCircle size={20} className="spin" />
          ) : job.status === 'completed' ? (
            <Check size={20} />
          ) : (
            <Sparkles size={20} />
          )}
        </span>
        <div className="grow">
          <strong>
            {job.kind === 'audio'
              ? 'Listening recording'
              : job.kind === 'essay'
                ? 'Writing assessment'
                : 'Your new practice'}
          </strong>
          <p>
            {job.options.grade && `Class ${job.options.grade} · `}
            {job.status === 'running'
              ? job.kind === 'audio'
                ? job.progress < 15
                  ? 'Writing the script and questions…'
                  : job.progress < 90
                    ? 'Recording the voices…'
                    : 'Checking and assembling audio…'
                : 'Working on it…'
              : job.status === 'queued'
                ? 'Queued · keep this tab open while generation runs'
                : job.status === 'failed'
                  ? job.error
                  : 'Saved and ready'}
          </p>
        </div>
        {job.status === 'failed' && job.retries < 3 && (
          <button className="button small" onClick={() => onRetry(job.id)}>
            Resume
          </button>
        )}
        {job.status === 'completed' && job.taskId && (
          <button className="button small" onClick={() => onOpen(job.taskId!)}>
            Open <ChevronRight size={14} />
          </button>
        )}
      </div>
      {busy && (
        <div className="progress-track">
          <div style={{ width: `${Math.max(5, job.progress)}%` }} />
        </div>
      )}
    </div>
  )
}
