export const stages = [
  { id: 'starter', label: 'Starting round', local: 'Startoviy', description: 'Build a strong foundation' },
  { id: 'district', label: 'District round', local: 'Rayonniy', description: 'Put your knowledge to work' },
  { id: 'regional', label: 'Regional round', local: 'Oblast', description: 'Think a little deeper' },
  { id: 'national', label: 'National round', local: 'Respublika', description: 'Rise to the challenge' },
]
export const skills = [
  {
    id: 'grammar',
    label: 'Use of English',
    description: 'Grammar, vocabulary & word formation',
    formats: ['mixed', 'mcq', 'gap_fill'],
  },
  {
    id: 'reading',
    label: 'Reading',
    description: 'Understand the detail. Find the meaning.',
    formats: ['mixed', 'mcq', 'true_false', 'gap_fill', 'matching'],
  },
  {
    id: 'writing',
    label: 'Writing',
    description: 'Find your voice, one draft at a time.',
    formats: ['essay', 'story', 'article', 'review', 'report', 'proposal', 'letter'],
  },
  {
    id: 'listening',
    label: 'Listening',
    description: 'Listen closely. Discover more.',
    formats: ['mixed', 'mcq', 'true_false', 'gap_fill', 'matching'],
  },
]
export const formats = {
  mixed: 'Mixed practice',
  mcq: 'Multiple choice',
  true_false: 'True / false',
  gap_fill: 'Write the missing part',
  matching: 'Matching',
  essay: 'Essay',
  story: 'Story',
  article: 'Article',
  review: 'Review',
  report: 'Report',
  proposal: 'Proposal',
  letter: 'Letter',
}

export function referenceProfile({ grade, stage, skill, format }) {
  const early = stage === 'starter' || stage === 'district'
  const national = stage === 'national'
  const minWords = national ? (grade === 11 ? 170 : 150) : { 9: 150, 10: 180, 11: 210 }[grade]
  const maxWords = national ? minWords + 10 : minWords + 30
  let adapted = (national && grade === 9) || (early && ['writing', 'listening'].includes(skill))
  if (early && !['mixed', 'mcq'].includes(format)) adapted = true
  if (stage === 'regional' && skill === 'writing' && format !== 'story') adapted = true
  const source = early
    ? `Tasks/${stage === 'starter' ? 'Startoviy' : 'Rayonniy'}/Grammar/eng${grade === 9 ? '09' : grade}${stage === 'district' ? '-2' : ''}.pdf`
    : national
      ? `Tasks/Respublika — Class ${grade === 9 ? '10 (adapted to 9)' : grade}, 2025`
      : `Tasks/Oblast/read+write+listen+grammar — Class ${grade}, Tour I`
  const structure = early
    ? 'The supplied paper has 30 four-option MCQs: 1–15 worth 1 point; 16–25 worth 2; 26–30 worth 3 (50 total). Grammar, vocabulary, phrasal verbs, synonyms, tenses, passive, conditionals, reported speech; final items involve short reading passages. District level is more demanding than starting level.'
    : national
      ? `20 points each for listening, reading, use of English; writing 40. Listening: a lecture with <=3-word answers and MCQs, and five speakers matched to activities and feelings. Reading: ${grade === 11 ? 'section matching (A–D), phrase gaps and literary MCQs' : 'true/false/not given, classification, short extract MCQs'}. Use of English: ${grade === 11 ? 'single-word open cloze and 3–6-word key-word transformations' : 'MCQ cloze, tense completion and a single word fitting three sentences'}. Writing: ${minWords}–${maxWords} words, 40 minutes, genre-specific purpose and audience.`
      : `20 points each for listening, reading, use of English; writing 40. Listening: true/false and MCQ. Reading: ${grade === 9 ? 'two passages and true/false' : 'sentence insertion, MCQ and true/false'}. Use of English: word formation from a bracketed root and 2–3-word key-word transformations. Writing: a story continuing a supplied opening, ${minWords}–${maxWords} words; ${grade === 9 ? 30 : 40} minutes.`
  return {
    source,
    adapted,
    structure,
    minWords,
    maxWords,
    level: { 9: 'B1–B2', 10: 'B2', 11: 'B2–C1' }[grade] + (national ? ', challenging national olympiad level' : ''),
  }
}

export const catalog = { grades: [9, 10, 11], stages, skills, formats }
