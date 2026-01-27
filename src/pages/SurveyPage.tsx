import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://aosfthajtmywcanvuthz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvc2Z0aGFqdG15d2NhbnZ1dGh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE3OTUsImV4cCI6MjA3NjE2Nzc5NX0.wwza28jdOCUKxs6-ipeAvBko_-TrVWU9IrNYeE2Tcto'
)

type Gender = 'male' | 'female' | 'child' | null
type Answer = 'Да' | 'Нет' | 'Не хочу отвечать' | null

interface SurveyAnswers {
  gender: Gender
  q1: Answer
  q2: Answer
  q3: Answer
  q4: Answer
  q5: Answer
}

const femaleQuestions = [
  'Работает ли ваш муж?',
  'Работаете ли вы?',
  'Есть ли у вас дети?',
  'Выполняете ли вы обязанности по дому?',
  'Хватает ли вашего заработка на уход за детьми?',
]

const maleQuestions = [
  'Работает ли ваша жена?',
  'Работаете ли вы?',
  'Есть ли у вас дети?',
  'Помогаете ли вы с обязанностями по дому?',
  'Хватает ли вашего заработка на содержание семьи?',
]

const childQuestions = [
  'Работает ли твой папа?',
  'Работает ли твоя мама?',
  'Есть ли у твоей семьи достаточно денег?',
  'Должна ли мама заботиться о детях дома?',
  'Помогаешь ли ты родителям по дому?',
]

const answerOptions: Answer[] = ['Да', 'Нет', 'Не хочу отвечать']

export default function SurveyPage() {
  const [step, setStep] = useState<'gender' | 'questions' | 'complete'>('gender')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<SurveyAnswers>({
    gender: null,
    q1: null,
    q2: null,
    q3: null,
    q4: null,
    q5: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const questions = answers.gender === 'female' 
    ? femaleQuestions 
    : answers.gender === 'child' 
      ? childQuestions 
      : maleQuestions

  const handleGenderSelect = (gender: Gender) => {
    setAnswers(prev => ({ ...prev, gender }))
    setStep('questions')
  }

  const handleAnswerSelect = async (answer: Answer) => {
    const questionKey = `q${currentQuestion + 1}` as keyof SurveyAnswers
    const newAnswers = { ...answers, [questionKey]: answer }
    setAnswers(newAnswers)

    if (currentQuestion < 4) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      // All questions answered, save to Supabase
      await saveSurvey(newAnswers)
    }
  }

  const saveSurvey = async (surveyAnswers: SurveyAnswers) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Get all existing IDs to find the next number
      const { data: existingRows, error: countError } = await supabase
        .from('opros')
        .select('id')

      if (countError) throw countError

      let nextNumber = 1
      if (existingRows && existingRows.length > 0) {
        // Find the highest number from all existing Subject IDs
        const numbers = existingRows
          .map(row => {
            const match = row.id.match(/Subject(\d+)/)
            return match ? parseInt(match[1], 10) : 0
          })
          .filter(n => n > 0)
        
        if (numbers.length > 0) {
          nextNumber = Math.max(...numbers) + 1
        }
      }

      const subjectId = `Subject${nextNumber}`

      const { error: insertError } = await supabase.from('opros').insert({
        id: subjectId,
        gender: surveyAnswers.gender,
        question1: surveyAnswers.q1,
        question2: surveyAnswers.q2,
        question3: surveyAnswers.q3,
        question4: surveyAnswers.q4,
        question5: surveyAnswers.q5,
      })

      if (insertError) throw insertError

      setStep('complete')
    } catch (err) {
      console.error('Error saving survey:', err)
      setError('Произошла ошибка при сохранении. Попробуйте ещё раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetSurvey = () => {
    setStep('gender')
    setCurrentQuestion(0)
    setAnswers({
      gender: null,
      q1: null,
      q2: null,
      q3: null,
      q4: null,
      q5: null,
    })
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Gender Selection */}
        {step === 'gender' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-center mb-8">
              Выберите ваш пол
            </h1>
            <button
              onClick={() => handleGenderSelect('male')}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 rounded-xl text-xl font-semibold transition-colors duration-200 active:scale-95"
            >
              Мужчина
            </button>
            <button
              onClick={() => handleGenderSelect('female')}
              className="w-full py-4 px-6 bg-pink-600 hover:bg-pink-700 rounded-xl text-xl font-semibold transition-colors duration-200 active:scale-95"
            >
              Женщина
            </button>
            <button
              onClick={() => handleGenderSelect('child')}
              className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 rounded-xl text-xl font-semibold transition-colors duration-200 active:scale-95"
            >
              Ребёнок
            </button>
          </div>
        )}

        {/* Questions */}
        {step === 'questions' && (
          <div className="space-y-6">
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Вопрос {currentQuestion + 1} из 5</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / 5) * 100}%` }}
                />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-center min-h-[60px] flex items-center justify-center">
              {questions[currentQuestion]}
            </h2>

            <div className="space-y-3">
              {answerOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-xl text-lg font-medium transition-colors duration-200 active:scale-95"
                >
                  {option}
                </button>
              ))}
            </div>

            {isSubmitting && (
              <div className="text-center text-gray-400">
                Сохранение...
              </div>
            )}

            {error && (
              <div className="text-center text-red-400 bg-red-900/30 p-3 rounded-lg">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Complete */}
        {step === 'complete' && (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">✓</div>
            <h1 className="text-2xl font-bold">
              Спасибо за участие!
            </h1>
            <p className="text-gray-400">
              Ваши ответы были успешно сохранены.
            </p>
            <button
              onClick={resetSurvey}
              className="mt-8 py-3 px-8 bg-gray-700 hover:bg-gray-600 rounded-xl text-lg font-medium transition-colors duration-200"
            >
              Пройти заново
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
