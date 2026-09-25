export type Skill = 'grammar' | 'reading' | 'writing' | 'listening'
export type Stage = 'starter' | 'district' | 'regional' | 'national'
export type Format =
  | 'mixed'
  | 'mcq'
  | 'true_false'
  | 'gap_fill'
  | 'matching'
  | 'essay'
  | 'story'
  | 'article'
  | 'review'
  | 'report'
  | 'proposal'
  | 'letter'
export interface User {
  id: string
  role: 'student' | 'admin'
  created_at: string
}
export interface Catalog {
  grades: number[]
  stages: { id: Stage; label: string; local: string; description: string }[]
  skills: { id: Skill; label: string; description: string; formats: Format[] }[]
  formats: Record<Format, string>
}
export interface Selection {
  grade: number
  stage: Stage
}
export interface Generation extends Selection {
  skill: Skill
  format: Format
  count: number
  audioMode: 'monologue' | 'dialogue' | 'speakers'
}
export interface Job {
  id: string
  kind: 'task' | 'audio' | 'essay'
  status: 'queued' | 'running' | 'failed' | 'completed'
  options: Partial<Generation>
  taskId: string | null
  attemptId: string | null
  progress: number
  error: string | null
  retries: number
  createdAt: string
}
export interface Criterion {
  key: string
  label: string
  band: number
  score: number
  maxScore: number
  feedback: string
  evidence: string
  nextStep: string
}
export interface Result {
  score: number
  maxScore: number
  band?: number
  criteria?: Criterion[]
  summary?: string
  strengths?: string[]
  improvements?: string[]
  corrections?: { original: string; improved: string; explanation: string }[]
  note?: string
  wordCount?: number
  questions?: {
    id: string
    answer: string
    correct: boolean
    score: number
    maxScore: number
    correctAnswer: string
    explanation: string
    evidence: string
  }[]
}
export interface TaskSummary extends Selection {
  id: string
  title: string
  skill: Skill
  format: Format
  shared: boolean
  duration: number | null
  createdAt: string
  seconds: number
  started: boolean
  attempts: number
  result: Result | null
  maxScore: number
  suggestedMinutes: number
}
export interface Draft {
  answers: Record<string, string>
  essay: string
  seconds: number
  revision: number
  updatedAt?: string | null
}
export interface Question {
  id: string
  type: 'mcq' | 'true_false' | 'gap_fill' | 'matching'
  text: string
  choices: string[]
  points: number
  maxWords: number
}
export interface Attempt {
  id: string
  task_id: string
  answers: Record<string, string>
  essay: string
  seconds: number
  status: 'grading' | 'completed' | 'failed'
  result: Result | null
  created_at: string
}
export interface Task extends Omit<TaskSummary, 'attempts'> {
  instructions: string
  passage: string
  writingPrompt: string
  questions: Question[]
  segments: { speaker: number; text: string }[]
  minWords: number
  maxWords: number
  audioUrl: string | null
  draft: Draft
  attempts: Attempt[]
  profile: { source: string; adapted: boolean; level: string }
}
export interface AccessCode {
  id: string
  label: string
  user_id: string | null
  disabled: number
  created_at: string
}
export interface AdminData {
  configured: boolean
  audioReady: boolean
  textModel: string
  ttsModel: string
  quota: { day: string; used: number; remaining: number; limit: number; timezone: string }
  codes: AccessCode[]
  jobs: Job[]
}
