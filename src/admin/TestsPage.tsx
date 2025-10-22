import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import AdminGate from './AdminGate';

type TestRow = {
  id: string;
  name: string;
  description: string | null;
  time_limit_minutes: number | null;
  is_published: boolean;
  content: unknown | null;
  created_by: string | null;
  created_at: string;
};

type NewTestForm = {
  name: string;
  description: string;
  time_limit_minutes: string; // keep as string for input, convert to number
  is_published: boolean;
  contentText: string; // JSON string
};

// Coerce legacy/flat content into the expected shape { sections: [{ name, questions: [...] }]}
function coerceContent(input: any): any {
  if (!input) return input;
  if (Array.isArray(input.sections)) return input;
  if (Array.isArray(input.questions)) {
    return { sections: [{ name: 'Section 1', questions: input.questions }] };
  }
  // If content was mistakenly wrapped again, try to unwrap one level
  if (input.content && Array.isArray(input.content.sections)) {
    return input.content;
  }
  return input;
}

// A simple sample "content" object (ONLY the content field value expected by the Admin form)
const SAMPLE_CONTENT_JSON = JSON.stringify(
  {
    sections: [
      {
        name: 'General Knowledge',
        questions: [
          {
            id: 'gk1',
            text: 'What is 2 + 2?',
            choices: [
              { key: 'A', label: '3' },
              { key: 'B', label: '4' },
              { key: 'C', label: '5' },
            ],
            correct: 'B',
            maxScore: 1,
          },
          {
            id: 'gk2',
            text: 'Which planet is known as the Red Planet?',
            choices: [
              { key: 'A', label: 'Mars' },
              { key: 'B', label: 'Jupiter' },
              { key: 'C', label: 'Venus' },
            ],
            correct: 'A',
            maxScore: 1,
          },
        ],
      },
      {
        name: 'English',
        questions: [
          {
            id: 'en1',
            text: `Choose the correct word: "Their/There/They're going to school."`,
            choices: [
              { key: 'A', label: 'Their' },
              { key: 'B', label: 'There' },
              { key: 'C', label: "They're" },
            ],
            correct: 'C',
            maxScore: 1,
          },
          {
            id: 'en2',
            text: 'Pick the synonym of “happy”.',
            choices: [
              { key: 'A', label: 'Sad' },
              { key: 'B', label: 'Joyful' },
              { key: 'C', label: 'Angry' },
            ],
            correct: 'B',
            maxScore: 1,
          },
        ],
      },
    ],
  },
  null,
  2
);

export default function TestsPage() {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<NewTestForm>({
    name: '',
    description: '',
    time_limit_minutes: '',
    is_published: false,
    // Updated default to a valid structure the runner expects
    contentText: '{\n  "sections": [\n    {\n      "name": "Section 1",\n      "questions": []\n    }\n  ]\n}',
  });

  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setTests((data ?? []) as TestRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const canCreate = useMemo(() => form.name.trim().length > 0, [form.name]);

  async function createTest(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;

    let content: unknown = null;
    if (form.contentText.trim()) {
      try {
        const parsed = JSON.parse(form.contentText);
        content = coerceContent(parsed);
      } catch (err) {
        setError('Content JSON is invalid.');
        return;
      }
    }

    const timeLimit =
      form.time_limit_minutes.trim() === ''
        ? null
        : Number.isNaN(Number(form.time_limit_minutes))
        ? null
        : Number(form.time_limit_minutes);

    setCreating(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      time_limit_minutes: timeLimit,
      is_published: form.is_published,
      content,
      // created_by can be set later if you add auth; keeping null for simplicity
    };

    const { error } = await supabase.from('tests').insert([payload]);

    setCreating(false);

    if (error) {
      setError(error.message);
      return;
    }

    setForm({
      name: '',
      description: '',
      time_limit_minutes: '',
      is_published: false,
      contentText: '{\n  "sections": [\n    {\n      "name": "Section 1",\n      "questions": []\n    }\n  ]\n}',
    });

    await load();
  }

  async function togglePublish(t: TestRow) {
    const { error } = await supabase
      .from('tests')
      .update({ is_published: !t.is_published })
      .eq('id', t.id);

    if (error) {
      setError(error.message);
      return;
    }
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this test?')) return;
    const { error } = await supabase.from('tests').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    await load();
  }

  const useSample = () => {
    setForm((prev) => ({
      ...prev,
      name: prev.name.trim() ? prev.name : 'Sample English Placement',
      description: prev.description,
      time_limit_minutes: prev.time_limit_minutes || '5',
      is_published: true,
      contentText: SAMPLE_CONTENT_JSON,
    }));
  };

  return (
    <AdminGate>
      <div style={{ maxWidth: 960, margin: '24px auto', padding: '0 16px' }}>
        <h1 style={{ marginTop: 8 }}>Admin · Tests</h1>

        <section style={{ margin: '24px 0', padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>Create test</h2>
          <form onSubmit={createTest}>
            <div style={{ display: 'grid', gap: 12 }}>
              <label>
                Name
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Algebra Practice Test"
                  style={{ display: 'block', width: '100%', marginTop: 6 }}
                />
              </label>

              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                  style={{ display: 'block', width: '100%', marginTop: 6 }}
                />
              </label>

              <label>
                Time limit (minutes)
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.time_limit_minutes}
                  onChange={(e) => setForm({ ...form, time_limit_minutes: e.target.value })}
                  placeholder="e.g. 45"
                  style={{ display: 'block', width: '100%', marginTop: 6 }}
                />
              </label>

              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                />
                Published
              </label>

              <label>
                Content (JSON for jsonb column)
                <textarea
                  value={form.contentText}
                  onChange={(e) => setForm({ ...form, contentText: e.target.value })}
                  rows={12}
                  style={{ display: 'block', width: '100%', fontFamily: 'monospace', marginTop: 6 }}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <small style={{ color: '#666' }}>
                  Tip: Expected shape is {"{ sections: [ { name, questions: [...] } ] }"}. If you only have
                  a top-level {"{ questions: [...] }"}, it will be wrapped into "Section 1".
                </small>
                <button type="button" onClick={useSample}>
                  Use sample content
                </button>
              </div>

              <div>
                <button type="submit" disabled={!canCreate || creating}>
                  {creating ? 'Creating…' : 'Create test'}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section style={{ margin: '24px 0' }}>
          <h2 style={{ marginTop: 0 }}>Existing tests</h2>
          {loading ? (
            <div>Loading…</div>
          ) : error ? (
            <div style={{ color: 'crimson' }}>{error}</div>
          ) : tests.length === 0 ? (
            <div>No tests yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {tests.map((t) => (
                <div
                  key={t.id}
                  style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, display: 'grid', gap: 6 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <strong>{t.name}</strong>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => togglePublish(t)}>
                        {t.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => remove(t.id)} style={{ color: 'crimson' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                  {t.description && <div style={{ color: '#555' }}>{t.description}</div>}
                  <div style={{ fontSize: 12, color: '#777' }}>
                    Time limit: {t.time_limit_minutes ?? '—'} · Created: {new Date(t.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminGate>
  );
}