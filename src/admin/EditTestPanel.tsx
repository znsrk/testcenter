import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import TestBuilder from './TestBuilder'
import type { TestContent } from '../lib/tests'

// Coerce legacy/flat content into the expected shape { sections: [{ name, questions: [...] }]}
function coerceContent(input: any): any {
  if (!input) return input
  if (Array.isArray(input.sections)) return input
  if (Array.isArray(input.questions)) {
    return { sections: [{ name: 'Section 1', questions: input.questions }] }
  }
  if (input.content && Array.isArray(input.content.sections)) {
    return input.content
  }
  return { sections: [{ name: 'Section 1', questions: [] }] }
}

type TestRow = {
  id: string;
  name: string;
  description: string | null;
  time_limit_minutes: number | null;
  is_published: boolean;
  content: unknown | null;
  created_by: string | null;
  created_at: string;
}

type Props = {
  test: TestRow
  onClose: () => void
  onSaved: () => void
}

export default function EditTestPanel({ test, onClose, onSaved }: Props) {
  const [name, setName] = useState(test.name)
  const [description, setDescription] = useState(test.description ?? '')
  const [timeLimit, setTimeLimit] = useState<string>(test.time_limit_minutes?.toString() ?? '')
  const [isPublished, setIsPublished] = useState<boolean>(test.is_published)
  const [contentText, setContentText] = useState<string>(() => JSON.stringify(coerceContent(test.content), null, 2))

  const [builderEnabled, setBuilderEnabled] = useState(true)
  const [builderModel, setBuilderModel] = useState<TestContent>(() => coerceContent(test.content))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const parsed = JSON.parse(contentText || '{}')
      const coerced = coerceContent(parsed)
      setBuilderModel(coerced)
    } catch {
      // ignore, keep previous builder model
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderEnabled])

  const canSave = useMemo(() => name.trim().length > 0, [name])

  const onBuilderChange = (next: TestContent) => {
    setBuilderModel(next)
    setContentText(JSON.stringify(next, null, 2))
  }

  async function save() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    let content: unknown = null
    try {
      content = coerceContent(JSON.parse(contentText))
    } catch {
      setError('Content JSON is invalid.')
      setSaving(false)
      return
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      time_limit_minutes: timeLimit.trim() === '' ? null : (Number.isNaN(Number(timeLimit)) ? null : Number(timeLimit)),
      is_published: isPublished,
      content,
    }

    const { error } = await supabase
      .from('tests')
      .update(payload)
      .eq('id', test.id)

    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }
    onSaved()
    onClose()
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong>Edit test</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onClose}>Close</button>
          <button type="button" onClick={save} disabled={!canSave || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'grid', gap: 12 }}>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Test name"
            style={{ display: 'block', width: '100%', marginTop: 6 }}
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional test description"
            rows={2}
            style={{ display: 'block', width: '100%', marginTop: 6 }}
          />
        </label>

        <label>
          Time limit (minutes)
          <input
            type="number"
            inputMode="numeric"
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
            placeholder="e.g. 45"
            style={{ display: 'block', width: '100%', marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          Published
        </label>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Visual Test Builder</strong>
          <button type="button" onClick={() => setBuilderEnabled(e => !e)}>
            {builderEnabled ? 'Disable' : 'Enable'}
          </button>
        </div>

        {builderEnabled && (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <TestBuilder value={builderModel} onChange={onBuilderChange} />
          </div>
        )}

        <label>
          Content (JSON)
          <textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            rows={builderEnabled ? 8 : 12}
            style={{ display: 'block', width: '100%', fontFamily: 'monospace', marginTop: 6 }}
          />
        </label>
      </div>
    </div>
  )
}