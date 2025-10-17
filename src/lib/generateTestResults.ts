import { supabase } from './supabase'

interface Section {
  section: string
  score: number
  maxScore: number
}

interface TestData {
  test_name: string
  score: number
  total_questions: number
  passed: boolean
  test_date: string
  sections: Section[]
}

const testTemplates = [
  {
    name: 'ЕНТ 1',
    sections: [
      { section: 'Математикалық Сауаттылық', maxScore: 10 },
      { section: 'Оқу Сауаттылығы', maxScore: 10 },
      { section: 'Қазақстан Тарихы', maxScore: 20 },
      { section: 'Математика', maxScore: 50 },
      { section: 'Информатика', maxScore: 50 },
    ],
  },
  {
    name: 'ЕНТ 2',
    sections: [
      { section: 'Математикалық Сауаттылық', maxScore: 10 },
      { section: 'Оқу Сауаттылығы', maxScore: 10 },
      { section: 'Қазақстан Тарихы', maxScore: 20 },
      { section: 'Математика', maxScore: 50 },
      { section: 'Информатика', maxScore: 50 },
    ],
  },
  {
    name: 'Негізгі ЕНТ',
    sections: [
      { section: 'Математикалық Сауаттылық', maxScore: 10 },
      { section: 'Оқу Сауаттылығы', maxScore: 10 },
      { section: 'Қазақстан Тарихы', maxScore: 20 },
      { section: 'Математика', maxScore: 50 },
      { section: 'Информатика', maxScore: 50 },
    ],
  },
]

// Generate random score between min% and max% of maxScore
function randomScore(maxScore: number, minPercent = 60, maxPercent = 95): number {
  const min = Math.floor((maxScore * minPercent) / 100)
  const max = Math.floor((maxScore * maxPercent) / 100)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Generate random date in the past year
function randomDate(): string {
  const now = new Date()
  const pastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const randomTime = pastYear.getTime() + Math.random() * (now.getTime() - pastYear.getTime())
  return new Date(randomTime).toISOString().split('T')[0]
}

export async function generateRandomTestResults(userId: string): Promise<void> {
  try {
    const testResults: TestData[] = testTemplates.map((template) => {
      const sections = template.sections.map((section) => ({
        section: section.section,
        score: randomScore(section.maxScore),
        maxScore: section.maxScore,
      }))

      const totalScore = sections.reduce((sum, s) => sum + s.score, 0)
      const totalQuestions = sections.reduce((sum, s) => sum + s.maxScore, 0)
      const percentage = (totalScore / totalQuestions) * 100
      const passed = percentage >= 65 // Pass threshold is 65%

      return {
        test_name: template.name,
        score: totalScore,
        total_questions: totalQuestions,
        passed,
        test_date: randomDate(),
        sections,
      }
    })

    // Insert all test results
    const { error } = await supabase
      .from('test_results')
      .insert(
        testResults.map((test) => ({
          user_id: userId,
          test_name: test.test_name,
          score: test.score,
          total_questions: test.total_questions,
          passed: test.passed,
          test_date: test.test_date,
          sections: test.sections,
        }))
      )

    if (error) {
      console.error('Error generating test results:', error)
      throw error
    }

    console.log(`✅ Generated ${testResults.length} test results for user ${userId}`)
  } catch (err) {
    console.error('Failed to generate test results:', err)
    throw err
  }
}