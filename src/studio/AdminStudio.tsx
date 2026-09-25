import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Headphones, KeyRound, Plus, Radio, ShieldCheck } from 'lucide-react'
import { api, message, post } from './api'
import { ErrorNotice, Filters, JobCard, Spinner } from './components'
import type { AdminData, Catalog, Format, Selection } from './types'

export function AdminStudio({
  catalog,
  selection,
  setSelection,
  onOpen,
  onChange,
}: {
  catalog: Catalog
  selection: Selection
  setSelection: (s: Selection) => void
  onOpen: (id: string) => void
  onChange: () => Promise<void>
}) {
  const [data, setData] = useState<AdminData | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [format, setFormat] = useState<Format>('mixed')
  const [mode, setMode] = useState('monologue')
  const [label, setLabel] = useState('Student access')
  const [count, setCount] = useState(1)
  const [created, setCreated] = useState<{ id: string; code: string; label: string }[]>([])
  const [copied, setCopied] = useState(false)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    try {
      setData(await api<AdminData>('/admin'))
    } catch (e) {
      setError(message(e))
    }
  }, [])
  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 6000)
    return () => clearInterval(timer)
  }, [refresh])
  async function action(run: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await run()
      await refresh()
      await onChange()
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }
  if (!data) return error ? <ErrorNotice text={error} onRetry={refresh} /> : <Spinner />
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE ROOM FOR EVERYONE TO GROW</div>
          <h1>The teacher’s studio.</h1>
          <p>Open doors with access codes. Bring the listening room to life.</p>
        </div>
        <span className="pill">
          <ShieldCheck size={15} /> Administrator
        </span>
      </div>
      {error && <ErrorNotice text={error} />}
      {(!data.configured || !data.audioReady) && (
        <div className="notice">
          <strong>Finish the server setup</strong>
          <p>
            {!data.configured && 'Add OPENAI_API_KEY to the server’s .env file. '}
            {!data.audioReady && 'Install FFmpeg or set FFMPEG_PATH. '}Restart the server after configuration. Saved
            profiles and tasks remain available.
          </p>
        </div>
      )}
      <section className="panel admin-audio">
        <div className="section-heading compact">
          <div>
            <h2>
              <Headphones size={22} /> Publish a listening task
            </h2>
            <p>One recording, shared with every student.</p>
          </div>
          <span className="quota-pill">
            {data.quota.remaining}
            <span>of 2 slots left today</span>
          </span>
        </div>
        <div className="audio-plan">
          <div>
            <span>01</span>
            <strong>A purposeful script</strong>
            <p>Questions written alongside a 6–8 minute script.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Voices with character</strong>
            <p>One speaker, a conversation, or five short extracts.</p>
          </div>
          <div>
            <span>03</span>
            <strong>Ready for everyone</strong>
            <p>Checked, saved, and published to the listening room.</p>
          </div>
        </div>
        <Filters catalog={catalog} value={selection} onChange={setSelection} />
        <div className="form-grid audio-options">
          <label>
            Recording style
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="monologue">Monologue · one voice</option>
              <option value="dialogue">Dialogue · two or three voices</option>
              <option value="speakers">Five speakers · short extracts</option>
            </select>
          </label>
          <label>
            Question format
            <select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
              {catalog.skills
                .find((s) => s.id === 'listening')!
                .formats.map((f) => (
                  <option key={f} value={f}>
                    {catalog.formats[f]}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="admin-publish-row">
          <div>
            <strong>20 questions · 20 points · 6–8 minutes</strong>
            <p>
              Two reservations per day across the site, including failed jobs.
              <br />
              Resets at midnight in {data.quota.timezone}. Retries reuse the same slot.
            </p>
          </div>
          <button
            className="button primary"
            disabled={busy || !data.configured || !data.audioReady || data.quota.remaining === 0}
            onClick={() =>
              action(() =>
                post('/admin/audio', {
                  ...selection,
                  skill: 'listening',
                  format,
                  count: 20,
                  audioMode: mode,
                  requestId: crypto.randomUUID(),
                })
              )
            }
          >
            <Radio size={17} /> Generate & publish
          </button>
        </div>
        <p className="small muted">
          Uses {data.textModel} + {data.ttsModel}. This calls the paid API. Completed recordings are retained; partial
          jobs resume from saved segments.
        </p>
      </section>
      {data.jobs.length > 0 && (
        <div className="section-block">
          <div className="section-heading">
            <h2>In the recording studio</h2>
          </div>
          {data.jobs.map((j) => (
            <JobCard key={j.id} job={j} onOpen={onOpen} onRetry={(id) => action(() => post(`/jobs/${id}/retry`))} />
          ))}
        </div>
      )}
      <section className="panel codes-panel">
        <div className="section-heading compact">
          <div>
            <h2>
              <KeyRound size={21} /> A code. A space of their own.
            </h2>
            <p>Each code creates one permanent profile on first use. Keep student names out of labels.</p>
          </div>
          <span className="badge">{data.codes.filter((c) => !c.disabled).length} ACTIVE</span>
        </div>
        <form
          className="code-form"
          onSubmit={(e) => {
            e.preventDefault()
            action(async () => {
              const values = await post<typeof created>('/admin/codes', { label, count })
              setCreated(values)
              setCopied(false)
            })
          }}
        >
          <label>
            Batch label
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={60}
              placeholder="September practice"
            />
          </label>
          <label>
            Number of codes
            <input
              type="number"
              min={1}
              max={50}
              required
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <button className="button primary" disabled={busy || created.length > 0}>
            <Plus size={16} /> Create codes
          </button>
        </form>
        {created.length > 0 && (
          <div className="new-codes">
            <div className="row">
              <div className="grow">
                <strong>Copy these codes before leaving this page</strong>
                <p>Only their hashes are stored. The full codes cannot be shown again.</p>
              </div>
              <button
                className="button small"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(created.map((c) => `${c.label}: ${c.code}`).join('\n'))
                    setCopied(true)
                  } catch {
                    setError('Clipboard unavailable. Select and copy the codes below.')
                  }
                }}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied' : 'Copy all'}
              </button>
            </div>
            {created.map((c) => (
              <div className="new-code" key={c.id}>
                <span>{c.label}</span>
                <code>{c.code}</code>
              </div>
            ))}
            <button className="text-button" onClick={() => setCreated([])}>
              I’ve saved these codes
            </button>
          </div>
        )}
        <div className="codes-table">
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Profile</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.codes.map((c) => (
                <tr key={c.id}>
                  <td>{c.label}</td>
                  <td>{c.user_id ? 'Activated' : 'Not yet used'}</td>
                  <td>
                    <span className={`badge ${c.disabled ? '' : 'complete'}`}>{c.disabled ? 'Revoked' : 'Active'}</span>
                  </td>
                  <td>
                    {!c.disabled &&
                      (revokeId === c.id ? (
                        <div className="row">
                          <button
                            className="text-button danger"
                            disabled={busy}
                            onClick={() =>
                              action(async () => {
                                await post(`/admin/codes/${c.id}/revoke`)
                                setRevokeId(null)
                              })
                            }
                          >
                            Confirm revoke
                          </button>
                          <button className="text-button" onClick={() => setRevokeId(null)}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button className="text-button danger" onClick={() => setRevokeId(c.id)}>
                          Revoke
                        </button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.codes.length && (
            <div className="quiet-note">Your first student’s next chapter starts with a code.</div>
          )}
        </div>
        <p className="small muted">Revoking a code signs out its sessions immediately and preserves its saved work.</p>
      </section>
    </>
  )
}
