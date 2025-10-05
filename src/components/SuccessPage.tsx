import { CheckCircle } from "lucide-react";
import { PrimaryButton } from "./PrimaryButton";

interface SuccessPageProps {
  onNavigate: (page: string) => void;
}

export function SuccessPage({ onNavigate }: SuccessPageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="w-full h-[80px] bg-white flex items-center justify-between px-8">
        <h1 
          onClick={() => onNavigate('home')}
          className="text-[36px] font-bold text-[#007BFF] cursor-pointer"
        >
          Ұлттық Тестілеу Орталығы
        </h1>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center pt-20">
        <div className="flex flex-col items-center">
          {/* Success Icon */}
          <CheckCircle 
            className="w-24 h-24 text-[#007BFF] mb-6" 
            strokeWidth={2}
          />
          
          {/* Success Title */}
          <h2 className="text-[24px] font-bold text-[#007BFF] text-center mb-4">
            Тіркелу сәтті аяқталды!
          </h2>
          
          {/* Success Description */}
          <p className="text-base text-black text-center mb-8 max-w-[600px]">
            Сізге хат жіберілді және кестені «Кестені қарау» батырмасынан көруге болады.
          </p>
          
          {/* Action Button */}
          <PrimaryButton onClick={() => onNavigate('schedule')}>
            Кестені қарау
          </PrimaryButton>
          
          {/* Back to Home Link */}
          <button 
            onClick={() => onNavigate('home')}
            className="mt-6 text-base text-[#007BFF] hover:underline transition-all duration-200"
          >
            Басты бетке қайту
          </button>
        </div>
      </main>
    </div>
  );
}