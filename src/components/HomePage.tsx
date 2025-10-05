import { useState, useEffect, useRef } from 'react';
import { PrimaryButton } from "./PrimaryButton";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

// Icon Components
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 hover:text-[#007BFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const ScheduleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#007BFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const ResultsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#007BFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
);
const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#007BFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

// Reusable NavCard with Icon
const NavCard = ({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick: () => void }) => (
  <button
    onClick={onClick}
    className="group flex w-full items-center gap-6 rounded-lg bg-white/80 backdrop-blur-sm p-6 text-left shadow-lg transition-all hover:shadow-xl hover:-translate-y-1"
  >
    <div>{icon}</div>
    <div>
      <h3 className="text-xl font-bold text-gray-800 group-hover:text-[#007BFF]">{title}</h3>
      <p className="mt-1 text-gray-600">{description}</p>
    </div>
  </button>
);

export function HomePage({ onNavigate }: HomePageProps) {
  const [isProfileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const userDetails = {
    name: 'Жарылғасын Жансерік',
    age: 17,
    address: 'Алматы, Абай к-сі 50',
    iin: '070101500123',
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-300/30 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-300/30 rounded-full filter blur-3xl"></div>
      </div>
      
      {/* Header/Navbar */}
      <header className="relative z-50 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto flex h-[70px] items-center justify-between px-6">
          <h1 className="text-2xl font-bold text-[#007BFF]">Ұлттық Тестілеу Орталығы</h1>
          <div className="relative" ref={profileRef}>
            <button onClick={() => setProfileOpen(!isProfileOpen)} aria-label="User Profile"><UserIcon /></button>
            <div className={`absolute right-0 mt-2 w-72 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-200 ease-out ${isProfileOpen ? 'transform opacity-100 scale-100' : 'transform opacity-0 scale-95'}`} role="menu">
              <div className="py-1" role="none">
                <div className="border-b border-gray-200 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900">{userDetails.name}</p>
                  <p className="text-sm text-gray-500">ИИН: {userDetails.iin}</p>
                </div>
                <div className="px-4 py-3 text-sm text-gray-700">
                  <p><span className="font-semibold">Жасы:</span> {userDetails.age}</p>
                  <p className="mt-1"><span className="font-semibold">Мекен-жайы:</span> {userDetails.address}</p>
                </div>
                <div className="border-t border-gray-200 px-4 py-2">
                  <a href="#" onClick={() => onNavigate('profile')} className="block text-sm text-[#007BFF] hover:underline">Профильді көру</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-grow items-center justify-center">
        <section className="w-full max-w-2xl px-6">
          <div className="grid grid-cols-1 gap-6">
            <NavCard 
              icon={<ScheduleIcon />}
              title="Тест Кестесі"
              description="Алдағы тесттердің уақыты мен күндерін қараңыз."
              onClick={() => onNavigate('schedule')} 
            />
            <NavCard 
              icon={<ResultsIcon />}
              title="Нәтижелер"
              description="Өткен тесттеріңіздің нәтижелерімен танысыңыз."
              onClick={() => onNavigate('results')} 
            />
            <NavCard 
              icon={<InfoIcon />}
              title="Маңызды Ақпарат"
              description="Тестілеу ережелері мен жаңалықтарын оқыңыз."
              onClick={() => onNavigate('info')} 
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4">
        <div className="container mx-auto flex justify-center items-center space-x-6 px-6">
          <a href="#" className="text-sm text-gray-500 hover:text-[#007BFF]">Құпиялылық саясаты</a>
          <a href="#" className="text-sm text-gray-500 hover:text-[#007BFF]">Пайдалану шарттары</a>
          <a href="#" className="text-sm text-gray-500 hover:text-[#007BFF]">Байланыс</a>
        </div>
      </footer>
    </div>
  );
}