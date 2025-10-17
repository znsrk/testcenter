import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface ResultsPageProps {
  onNavigate: (page: string) => void;
}

interface TestResult {
  id: string;
  test_name: string;
  score: number;
  total_questions: number;
  passed: boolean;
  test_date: string;
  sections?: Array<{
    section: string;
    score: number;
    maxScore: number;
  }>;
}

export function ResultsPage({ onNavigate }: ResultsPageProps) {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchTestResults();
    }
  }, [user?.id]);

  const fetchTestResults = async () => {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user?.id)
        .order('test_date', { ascending: false });

      if (error) {
        console.error('Error fetching test results:', error);
      } else if (data) {
        setTestResults(data);
        if (data.length > 0 && !selectedTest) {
          setSelectedTest(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch test results:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentTest = testResults.find(t => t.id === selectedTest);

  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007BFF] mx-auto mb-4"></div>
          <p className="text-gray-600">Нәтижелер жүктелуде...</p>
        </div>
      </div>
    );
  }

  if (testResults.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button 
            onClick={() => onNavigate('home')}
            className="text-[#007BFF] hover:underline mb-4"
          >
            ← Басты бетке қайту
          </button>
          <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Нәтижелер жоқ</h2>
            <p className="text-gray-600 mb-6">Сіз әлі ешбір тест тапсырмадыңыз</p>
            <button
              onClick={() => onNavigate('schedule')}
              className="bg-[#007BFF] text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Тест кестесін қарау
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <p className="text-[#9CA3AF] mb-4">
            {user?.first_name && user?.last_name 
              ? `${user.first_name} ${user.last_name}` 
              : user?.email}
          </p>
        </div>

        {/* Test Selection Buttons */}
        <div className="flex space-x-2 mb-6 border-b overflow-x-auto">
          {testResults.map((test) => (
            <button
              key={test.id}
              onClick={() => setSelectedTest(test.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                selectedTest === test.id
                  ? 'border-b-2 border-[#007BFF] text-[#007BFF]'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              {test.test_name}
            </button>
          ))}
        </div>

        {/* Dynamic Results Display */}
        {currentTest && (
          <div>
            <div className="bg-[#E6EDF8] rounded-lg px-6 py-4 inline-block mb-6">
              <p className="text-black">
                Жалпы балл: <span className="text-[#007BFF]">{currentTest.score}/{currentTest.total_questions}</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Күні: {new Date(currentTest.test_date).toLocaleDateString('kk-KZ')}
              </p>
              <p className="text-sm mt-1">
                Статус: {currentTest.passed 
                  ? <span className="text-green-600 font-semibold">✓ Өтті</span>
                  : <span className="text-red-600 font-semibold">✗ Өте алмады</span>
                }
              </p>
            </div>

            {currentTest.sections && currentTest.sections.length > 0 ? (
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
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-600">
                Бөлімдер бойынша деректер жоқ
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}