import { Mail, Phone, MapPin } from 'lucide-react';

interface InfoPageProps {
  onNavigate: (page: string) => void;
}

export function InfoPage({ onNavigate }: InfoPageProps) {
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
          <h1 className="text-[32px] text-black mb-2">Байланыс ақпараты</h1>
          <p className="text-[#9CA3AF]">Бізбен хабарласыңыз</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-[#E6EDF8] rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="bg-[#E6EDF8] rounded-full p-3">
                <Phone className="w-6 h-6 text-[#007BFF]" />
              </div>
              <div>
                <h3 className="text-black mb-1">Телефон</h3>
                <p className="text-[#9CA3AF]">+7 (701) 234-56-78</p>
                <p className="text-[#9CA3AF]">+7 (727) 345-67-89</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E6EDF8] rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="bg-[#E6EDF8] rounded-full p-3">
                <Mail className="w-6 h-6 text-[#007BFF]" />
              </div>
              <div>
                <h3 className="text-black mb-1">Электрондық пошта</h3>
                <p className="text-[#9CA3AF]">info@ent-center.kz</p>
                <p className="text-[#9CA3AF]">support@ent-center.kz</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E6EDF8] rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="bg-[#E6EDF8] rounded-full p-3">
                <MapPin className="w-6 h-6 text-[#007BFF]" />
              </div>
              <div>
                <h3 className="text-black mb-1">Мекенжай</h3>
                <p className="text-[#9CA3AF]">Қазақстан Республикасы, Алматы қаласы</p>
                <p className="text-[#9CA3AF]">Әл-Фараби даңғылы, 71</p>
                <p className="text-[#9CA3AF]">050040</p>
              </div>
            </div>
          </div>

          <div className="bg-[#E6EDF8] rounded-lg p-6">
            <h3 className="text-black mb-2">Жұмыс уақыты</h3>
            <p className="text-[#9CA3AF]">Дүйсенбі - Жұма: 09:00 - 18:00</p>
            <p className="text-[#9CA3AF]">Сенбі: 10:00 - 15:00</p>
            <p className="text-[#9CA3AF]">Жексенбі: Демалыс</p>
          </div>
        </div>
      </div>
    </div>
  );
}
