import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

// Survey data from CSV
const surveyData = [
  { id: 'Subject13', gender: 'male', question1: 'Не хочу отвечать', question2: 'Не хочу отвечать', question3: 'Не хочу отвечать', question4: 'Не хочу отвечать', question5: 'Не хочу отвечать' },
  { id: 'Subject14', gender: 'female', question1: 'Нет', question2: 'Да', question3: 'Нет', question4: 'Да', question5: 'Нет' },
  { id: 'Subject15', gender: 'female', question1: 'Нет', question2: 'Да', question3: 'Нет', question4: 'Нет', question5: 'Не хочу отвечать' },
  { id: 'Subject16', gender: 'child', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Не хочу отвечать' },
  { id: 'Subject17', gender: 'male', question1: 'Не хочу отвечать', question2: 'Не хочу отвечать', question3: 'Нет', question4: 'Да', question5: 'Не хочу отвечать' },
  { id: 'Subject18', gender: 'male', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject19', gender: 'male', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject20', gender: 'female', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject21', gender: 'child', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject22', gender: 'male', question1: 'Нет', question2: 'Да', question3: 'Нет', question4: 'Да', question5: 'Не хочу отвечать' },
  { id: 'Subject23', gender: 'male', question1: 'Нет', question2: 'Да', question3: 'Да', question4: 'Нет', question5: 'Да' },
  { id: 'Subject24', gender: 'child', question1: 'Да', question2: 'Нет', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject25', gender: 'female', question1: 'Да', question2: 'Да', question3: 'Нет', question4: 'Да', question5: 'Не хочу отвечать' },
  { id: 'Subject26', gender: 'female', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject27', gender: 'male', question1: 'Да', question2: 'Нет', question3: 'Да', question4: 'Не хочу отвечать', question5: 'Да' },
  { id: 'Subject28', gender: 'male', question1: 'Не хочу отвечать', question2: 'Нет', question3: 'Не хочу отвечать', question4: 'Не хочу отвечать', question5: 'Нет' },
  { id: 'Subject29', gender: 'child', question1: 'Нет', question2: 'Да', question3: 'Не хочу отвечать', question4: 'Да', question5: 'Да' },
  { id: 'Subject30', gender: 'male', question1: 'Да', question2: 'Не хочу отвечать', question3: 'Да', question4: 'Не хочу отвечать', question5: 'Да' },
  { id: 'Subject31', gender: 'child', question1: 'Не хочу отвечать', question2: 'Не хочу отвечать', question3: 'Не хочу отвечать', question4: 'Да', question5: 'Нет' },
  { id: 'Subject32', gender: 'female', question1: 'Да', question2: 'Нет', question3: 'Нет', question4: 'Да', question5: 'Не хочу отвечать' },
  { id: 'Subject33', gender: 'female', question1: 'Не хочу отвечать', question2: 'Да', question3: 'Нет', question4: 'Да', question5: 'Не хочу отвечать' },
  { id: 'Subject34', gender: 'male', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject35', gender: 'female', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject36', gender: 'child', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject37', gender: 'child', question1: 'Да', question2: 'Нет', question3: 'Не хочу отвечать', question4: 'Да', question5: 'Да' },
  { id: 'Subject38', gender: 'male', question1: 'Да', question2: 'Нет', question3: 'Да', question4: 'Не хочу отвечать', question5: 'Да' },
  { id: 'Subject39', gender: 'female', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Нет', question5: 'Да' },
  { id: 'Subject40', gender: 'female', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject41', gender: 'female', question1: 'Да', question2: 'Нет', question3: 'Нет', question4: 'Нет', question5: 'Не хочу отвечать' },
  { id: 'Subject42', gender: 'male', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject43', gender: 'male', question1: 'Нет', question2: 'Да', question3: 'Да', question4: 'Нет', question5: 'Да' },
  { id: 'Subject44', gender: 'male', question1: 'Нет', question2: 'Нет', question3: 'Нет', question4: 'Не хочу отвечать', question5: 'Нет' },
  { id: 'Subject45', gender: 'child', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject46', gender: 'female', question1: 'Не хочу отвечать', question2: 'Да', question3: 'Нет', question4: 'Да', question5: 'Да' },
  { id: 'Subject47', gender: 'female', question1: 'Нет', question2: 'Нет', question3: 'Нет', question4: 'Да', question5: 'Нет' },
  { id: 'Subject48', gender: 'female', question1: 'Не хочу отвечать', question2: 'Нет', question3: 'Нет', question4: 'Да', question5: 'Не хочу отвечать' },
  { id: 'Subject49', gender: 'female', question1: 'Не хочу отвечать', question2: 'Не хочу отвечать', question3: 'Нет', question4: 'Да', question5: 'Да' },
  { id: 'Subject50', gender: 'male', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject51', gender: 'child', question1: 'Нет', question2: 'Нет', question3: 'Нет', question4: 'Нет', question5: 'Нет' },
  { id: 'Subject52', gender: 'child', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Не хочу отвечать' },
  { id: 'Subject53', gender: 'child', question1: 'Нет', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject54', gender: 'male', question1: 'Нет', question2: 'Нет', question3: 'Нет', question4: 'Да', question5: 'Не хочу отвечать' },
  { id: 'Subject55', gender: 'male', question1: 'Нет', question2: 'Нет', question3: 'Нет', question4: 'Да', question5: 'Не хочу отвечать' },
  { id: 'Subject56', gender: 'female', question1: 'Нет', question2: 'Да', question3: 'Нет', question4: 'Да', question5: 'Не хочу отвечать' },
  { id: 'Subject57', gender: 'male', question1: 'Нет', question2: 'Да', question3: 'Нет', question4: 'Да', question5: 'Не хочу отвечать' },
  { id: 'Subject58', gender: 'child', question1: 'Не хочу отвечать', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject59', gender: 'male', question1: 'Нет', question2: 'Нет', question3: 'Нет', question4: 'Да', question5: 'Нет' },
  { id: 'Subject60', gender: 'male', question1: 'Не хочу отвечать', question2: 'Не хочу отвечать', question3: 'Нет', question4: 'Нет', question5: 'Да' },
  { id: 'Subject61', gender: 'male', question1: 'Не хочу отвечать', question2: 'Нет', question3: 'Да', question4: 'Нет', question5: 'Нет' },
  { id: 'Subject62', gender: 'male', question1: 'Да', question2: 'Нет', question3: 'Да', question4: 'Нет', question5: 'Да' },
  { id: 'Subject63', gender: 'female', question1: 'Не хочу отвечать', question2: 'Нет', question3: 'Нет', question4: 'Да', question5: 'Не хочу отвечать' },
  { id: 'Subject64', gender: 'male', question1: 'Нет', question2: 'Нет', question3: 'Нет', question4: 'Да', question5: 'Да' },
  { id: 'Subject65', gender: 'child', question1: 'Да', question2: 'Да', question3: 'Да', question4: 'Да', question5: 'Да' },
  { id: 'Subject66', gender: 'male', question1: 'Нет', question2: 'Да', question3: 'Нет', question4: 'Да', question5: 'Не хочу отвечать' },
  { id: 'Subject7', gender: 'child', question1: 'Да', question2: 'Нет', question3: 'Да', question4: 'Нет', question5: 'Да' },
]

const COLORS = {
  yes: '#22c55e',
  no: '#ef4444',
  skip: '#6b7280',
  male: '#3b82f6',
  female: '#ec4899',
  child: '#22c55e',
}

const questionLabels = {
  male: [
    'Работает ли ваша жена?',
    'Работаете ли вы?',
    'Есть ли у вас дети?',
    'Помогаете ли вы с обязанностями по дому?',
    'Хватает ли вашего заработка на содержание семьи?',
  ],
  female: [
    'Работает ли ваш муж?',
    'Работаете ли вы?',
    'Есть ли у вас дети?',
    'Выполняете ли вы обязанности по дому?',
    'Хватает ли вашего заработка на уход за детьми?',
  ],
  child: [
    'Работает ли твой папа?',
    'Работает ли твоя мама?',
    'Есть ли у твоей семьи достаточно денег?',
    'Должна ли мама заботиться о детях дома?',
    'Помогаешь ли ты родителям по дому?',
  ],
}

// Calculate statistics
const getGenderStats = () => {
  const stats = { male: 0, female: 0, child: 0 }
  surveyData.forEach(row => {
    if (row.gender === 'male') stats.male++
    else if (row.gender === 'female') stats.female++
    else if (row.gender === 'child') stats.child++
  })
  return [
    { name: 'Мужчины', value: stats.male, color: COLORS.male },
    { name: 'Женщины', value: stats.female, color: COLORS.female },
    { name: 'Дети', value: stats.child, color: COLORS.child },
  ]
}

// Calculate stats for a specific question filtered by gender
const getQuestionStatsByGender = (
  questionKey: 'question1' | 'question2' | 'question3' | 'question4' | 'question5',
  gender: 'male' | 'female' | 'child'
) => {
  const stats = { yes: 0, no: 0, skip: 0 }
  surveyData
    .filter(row => row.gender === gender)
    .forEach(row => {
      const answer = row[questionKey]
      if (answer === 'Да') stats.yes++
      else if (answer === 'Нет') stats.no++
      else stats.skip++
    })
  return [
    { name: 'Да', value: stats.yes, color: COLORS.yes },
    { name: 'Нет', value: stats.no, color: COLORS.no },
    { name: 'Не хочу отвечать', value: stats.skip, color: COLORS.skip },
  ]
}

interface PieChartCardProps {
  title: string
  data: { name: string; value: number; color: string }[]
}

const PieChartCard = ({ title, data }: PieChartCardProps) => (
  <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
    <h3 className="text-lg font-semibold text-white mb-4 text-center">{title}</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Legend
            wrapperStyle={{ color: '#fff' }}
            formatter={(value) => <span style={{ color: '#d1d5db' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
)

export default function SurveyPage() {
  const genderStats = getGenderStats()
  const totalResponses = surveyData.length

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Результаты опроса
          </h1>
          <p className="text-gray-400 text-lg">
            Всего ответов: <span className="text-white font-semibold">{totalResponses}</span>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Мужчины</p>
                <p className="text-3xl font-bold">{genderStats[0].value}</p>
              </div>
              <div className="text-5xl">👨</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-pink-600 to-pink-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-200 text-sm">Женщины</p>
                <p className="text-3xl font-bold">{genderStats[1].value}</p>
              </div>
              <div className="text-5xl">👩</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm">Дети</p>
                <p className="text-3xl font-bold">{genderStats[2].value}</p>
              </div>
              <div className="text-5xl">👶</div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Gender Distribution */}
          <PieChartCard title="Распределение по полу" data={genderStats} />
        </div>

        {/* Questions by Gender */}
        {(['male', 'female', 'child'] as const).map((gender) => (
          <div key={gender} className="mt-10">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className={`px-3 py-1 rounded-lg ${
                gender === 'male' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : gender === 'female'
                    ? 'bg-pink-500/20 text-pink-400'
                    : 'bg-green-500/20 text-green-400'
              }`}>
                {gender === 'male' ? '👨 Мужчины' : gender === 'female' ? '👩 Женщины' : '👶 Дети'}
              </span>
              <span className="text-gray-400 text-base font-normal">
                ({surveyData.filter(r => r.gender === gender).length} ответов)
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {questionLabels[gender].map((question, index) => (
                <PieChartCard
                  key={index}
                  title={question}
                  data={getQuestionStatsByGender(
                    `question${index + 1}` as 'question1' | 'question2' | 'question3' | 'question4' | 'question5',
                    gender
                  )}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Data Table */}
        <div className="mt-10 bg-gray-800 rounded-2xl p-6 shadow-xl overflow-hidden">
          <h2 className="text-xl font-semibold mb-6">Все ответы</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">ID</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Пол</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">В1</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">В2</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">В3</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">В4</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">В5</th>
                </tr>
              </thead>
              <tbody>
                {surveyData.map((row, index) => (
                  <tr 
                    key={row.id} 
                    className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                      index % 2 === 0 ? 'bg-gray-800/50' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-gray-300">{row.id}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        row.gender === 'male' 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : row.gender === 'female'
                            ? 'bg-pink-500/20 text-pink-400'
                            : 'bg-green-500/20 text-green-400'
                      }`}>
                        {row.gender === 'male' ? 'М' : row.gender === 'female' ? 'Ж' : 'Р'}
                      </span>
                    </td>
                    {[row.question1, row.question2, row.question3, row.question4, row.question5].map((answer, i) => (
                      <td key={i} className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          answer === 'Да'
                            ? 'bg-green-500/20 text-green-400'
                            : answer === 'Нет'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {answer === 'Не хочу отвечать' ? '—' : answer}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
