import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface ResultsPageProps {
  onNavigate: (page: string) => void;
}

// Mock data for all tests
const allTestResults = {
  ent1: {
    name: 'ЕНТ 1',
    totalScore: 105,
    maxScore: 140,
    sections: [
      { section: 'Математикалық Сауаттылық', score: 7, maxScore: 10 },
      { section: 'Оқу Сауаттылығы', score: 8, maxScore: 10 },
      { section: 'Қазақстан Тарихы', score: 15, maxScore: 20 },
      { section: 'Математика', score: 38, maxScore: 50 },
      { section: 'Информатика', score: 37, maxScore: 50 },
    ],
  },
  ent2: {
    name: 'ЕНТ 2',
    totalScore: 112,
    maxScore: 140,
    sections: [
      { section: 'Математикалық Сауаттылық', score: 9, maxScore: 10 },
      { section: 'Оқу Сауаттылығы', score: 7, maxScore: 10 },
      { section: 'Қазақстан Тарихы', score: 18, maxScore: 20 },
      { section: 'Математика', score: 40, maxScore: 50 },
      { section: 'Информатика', score: 38, maxScore: 50 },
    ],
  },
  main_ent: {
    name: 'Негізгі ЕНТ',
    totalScore: 118,
    maxScore: 140,
    sections: [
      { section: 'Математикалық Сауаттылық', score: 8, maxScore: 10 },
      { section: 'Оқу Сауаттылығы', score: 9, maxScore: 10 },
      { section: 'Қазақстан Тарихы', score: 16, maxScore: 20 },
      { section: 'Математика', score: 42, maxScore: 50 },
      { section: 'Информатика', score: 43, maxScore: 50 },
    ],
  }
};

type TestKey = keyof typeof allTestResults;

export function ResultsPage({ onNavigate }: ResultsPageProps) {
  const [selectedTest, setSelectedTest] = useState<TestKey>('main_ent');
  
  const userName = 'Жарылғасын Жансерік';
  const currentTest = allTestResults[selectedTest];

  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button 
            onClick={() => onNavigate('home')}
            className="text-[#007BFF] hover:underline mb-4"
          >
            ← Басты бетке қайту
          </button>
          <h1 className="text-[32px] text-black mb-2">ЕНТ нәтижелері</h1>
          <p className="text-[#9CA3AF] mb-4">{userName}</p>
        </div>

        {/* Test Selection Buttons */}
        <div className="flex space-x-2 mb-6 border-b">
          {(Object.keys(allTestResults) as TestKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedTest(key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                selectedTest === key
                  ? 'border-b-2 border-[#007BFF] text-[#007BFF]'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              {allTestResults[key].name}
            </button>
          ))}
        </div>

        {/* Dynamic Results Display */}
        <div>
          <div className="bg-[#E6EDF8] rounded-lg px-6 py-4 inline-block mb-6">
            <p className="text-black">
              Жалпы балл: <span className="text-[#007BFF]">{currentTest.totalScore}/{currentTest.maxScore}</span>
            </p>
          </div>

          <div className="bg-white border border-[#E6EDF8] rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Бөлім</TableHead>
                  <TableHead className="text-right">Нәтиже</TableHead>
                  <TableHead className="text-right">Макс. балл</TableHead>
                  <TableHead className="text-right">Пайыз</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentTest.sections.map((section, index) => {
                  const percentage = Math.round((section.score / section.maxScore) * 100);
                  return (
                    <TableRow key={index}>
                      <TableCell>{section.section}</TableCell>
                      <TableCell className="text-right">
                        <span className={getScoreColor(section.score, section.maxScore)}>
                          {section.score}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-[#9CA3AF]">
                        {section.maxScore}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={getScoreColor(section.score, section.maxScore)}>
                          {percentage}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}