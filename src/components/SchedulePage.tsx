import { Calendar, Clock } from 'lucide-react';

interface SchedulePageProps {
  onNavigate: (page: string) => void;
}

export function SchedulePage({ onNavigate }: SchedulePageProps) {
  const testDates = [
    {
      title: 'Наурыз сессиясы',
      date: '15 Наурыз 2025',
      time: '10:00 - 14:00',
      description: 'Бірінші ЕНТ сессиясы',
      status: 'Тіркеу жабық'
    },
    {
      title: 'Мамыр-Тамыз сессиясы',
      date: '30 Мамыр - 30 Тамыз 2025',
      time: '10:00 - 14:00',
      description: 'Негізгі ЕНТ сессиясы',
      status: 'Тіркеу ашық'
    }
  ];

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
          <h1 className="text-[32px] text-black mb-2">ЕНТ кестесі</h1>
          <p className="text-[#9CA3AF]">Тестілеу күндері мен уақыты</p>
        </div>

        <div className="space-y-6">
          {testDates.map((session, index) => (
            <div 
              key={index}
              className="bg-white border border-[#E6EDF8] rounded-lg p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-black mb-1">{session.title}</h3>
                  <p className="text-[#9CA3AF]">{session.description}</p>
                </div>
                <span 
                  className={`inline-block px-3 py-1 rounded-full ${
                    session.status === 'Тіркеу ашық'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {session.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-[#E6EDF8] rounded-full p-2">
                    <Calendar className="w-5 h-5 text-[#007BFF]" />
                  </div>
                  <div>
                    <p className="text-[#9CA3AF]">Күні</p>
                    <p className="text-black">{session.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-[#E6EDF8] rounded-full p-2">
                    <Clock className="w-5 h-5 text-[#007BFF]" />
                  </div>
                  <div>
                    <p className="text-[#9CA3AF]">Уақыты</p>
                    <p className="text-black">{session.time}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-[#E6EDF8] rounded-lg p-6">
          <h3 className="text-black mb-3">Маңызды ақпарат</h3>
          <ul className="space-y-2 text-[#9CA3AF]">
            <li>• Тестілеуге дейін 30 минут бұрын келіңіз</li>
            <li>• Жеке куәлігіңізді (ID карта) алып келуді ұмытпаңыз</li>
            <li>• Телефондар мен электронды құрылғылар тыйым салынған</li>
            <li>• Тестілеу ұзақтығы 4 сағат</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
