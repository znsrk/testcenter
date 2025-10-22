import { supabase } from './supabase'

export type AnswerKey = string

export interface Choice {
  key: AnswerKey
  label: string
}

export interface QuestionDefinition {
  id: string
  text: string
  choices: Choice[]
  correct: AnswerKey
  maxScore: number
}

export interface SectionDefinition {
  name: string
  questions: QuestionDefinition[]
}

export interface TestContent {
  sections: SectionDefinition[]
}

export interface TestRecord {
  id: string
  name: string
  description?: string | null
  time_limit_minutes?: number | null
  is_published: boolean
  content: TestContent
  created_by?: string | null
  created_at: string
}

// Minimal admin check: replace with a real role flag when available
export function isAdminEmail(email?: string | null) {
  if (!email) return false
  const ADMIN_EMAILS = [
    '251311@astanait.edu.kz',
  ]
  return ADMIN_EMAILS.includes(email)
}

function ensureQuestionIds(content: TestContent): TestContent {
  // Ensure each question has a stable id
  const sections = content.sections.map((sec, si) => ({
    ...sec,
    questions: sec.questions.map((q, qi) => ({
      ...q,
      id: q.id || `s${si+1}q${qi+1}`,
    })),
  }))
  return { sections }
}

export async function listPublishedTests(): Promise<{ data?: Pick<TestRecord, 'id'|'name'|'description'|'time_limit_minutes'>[]; error?: string }> {
  const { data, error } = await supabase
    .from('tests')
    .select('id,name,description,time_limit_minutes')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
  if (error) return { error: error.message }
  return { data: data as any }
}

export async function getTestById(id: string): Promise<{ data?: TestRecord; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return { error: error?.message || 'Test not found' }

    const rawContent = (data as any)?.content
    if (!rawContent || !Array.isArray(rawContent.sections)) {
      return { error: 'Invalid test content: expected content.sections[]' }
    }

    // Ensure IDs in content
    const withIds: TestRecord = {
      ...data,
      content: ensureQuestionIds(rawContent as TestContent),
    } as TestRecord
    return { data: withIds }
  } catch (e: any) {
    return { error: e?.message || 'Failed to load test' }
  }
}

export interface UploadTestJSON {
  name: string
  description?: string
  time_limit_minutes?: number
  is_published?: boolean
  content: TestContent
}

export async function uploadTestFromJSON(json: UploadTestJSON, created_by?: string): Promise<{ id?: string; error?: string }> {
  try {
    const normalized: UploadTestJSON = {
      ...json,
      is_published: json.is_published ?? true,
      content: ensureQuestionIds(json.content),
    }
    const { data, error } = await supabase
      .from('tests')
      .insert([{
        name: normalized.name,
        description: normalized.description ?? null,
        time_limit_minutes: normalized.time_limit_minutes ?? null,
        is_published: normalized.is_published,
        content: normalized.content,
        created_by: created_by ?? null,
      }])
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { id: data?.id }
  } catch (e: any) {
    return { error: e.message ?? 'Failed to upload test' }
  }
}

export interface SubmissionResult {
  totalMax: number
  totalScore: number
  sections: { section: string; score: number; maxScore: number }[]
}

export function scoreAnswers(content: TestContent, answers: Record<string, AnswerKey | undefined>): SubmissionResult {
  let totalMax = 0
  let totalScore = 0
  const perSection: { section: string; score: number; maxScore: number }[] = []

  for (const sec of content.sections) {
    let secMax = 0
    let secScore = 0
    for (const q of sec.questions) {
      secMax += q.maxScore
      if (answers[q.id] === q.correct) secScore += q.maxScore
    }
    perSection.push({ section: sec.name, score: secScore, maxScore: secMax })
    totalMax += secMax
    totalScore += secScore
  }
  return { totalMax, totalScore, sections: perSection }
}

export async function submitAttempt(params: {
  userId: string
  testName: string
  content: TestContent
  answers: Record<string, AnswerKey | undefined>
}): Promise<{ error?: string }> {
  const { userId, testName, content, answers } = params
  const scored = scoreAnswers(content, answers)
  const passed = scored.totalMax > 0 && (scored.totalScore / scored.totalMax) >= 0.6

  const { error } = await supabase
    .from('test_results')
    .insert([{
      user_id: userId,
      test_name: testName,
      score: scored.totalScore,
      total_questions: content.sections.reduce((n, s) => n + s.questions.length, 0),
      passed: passed,
      test_date: new Date().toISOString().split('T')[0],
      sections: scored.sections
    }])
  if (error) return { error: error.message }
  return {}
}