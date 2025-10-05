import { useState } from "react";
import { PrimaryButton } from "./PrimaryButton";
import { InputField } from "./InputField";
import { SelectField } from "./SelectField";

interface RegistrationPageProps {
  onNavigate: (page: string) => void;
}

export function RegistrationPage({ onNavigate }: RegistrationPageProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    iin: '',
    city: '',
    testType: ''
  });

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const testTypes = [
    { value: 'ent', label: 'ЕНТ' },
    { value: 'kaztest', label: 'Қазтест' },
    { value: 'ielts', label: 'IELTS' },
    { value: 'sat', label: 'SAT' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.fullName && formData.iin && formData.city && formData.testType && agreedToTerms) {
      onNavigate('success');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
      <main className="flex flex-col items-center pt-12">
        <h2 className="text-[24px] font-bold text-black mb-4">
          Тіркелу
        </h2>
        
        <p className="text-base text-black mb-8 text-center max-w-[600px]">
          Тестке тіркелу үшін төмендегі мәліметтерді толтырыңыз.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 p-5">
          <div className="flex flex-col gap-2">
            <InputField
              placeholder="Аты-жөні"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <InputField
              placeholder="ЖСН"
              value={formData.iin}
              onChange={(e) => handleInputChange('iin', e.target.value)}
              type="text"
              required
            />
            <p className="text-sm text-[#9CA3AF] ml-2">ЖСН 12 цифр</p>
          </div>

          <div className="flex flex-col gap-2">
            <InputField
              placeholder="Қала"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <SelectField
              placeholder="Тест түрі"
              value={formData.testType}
              onChange={(e) => handleInputChange('testType', e.target.value)}
              options={testTypes}
              required
            />
          </div>

          <div className="flex items-center gap-3 mt-4 mb-6">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="w-4 h-4 text-[#007BFF] bg-white border-[#E6EDF8] rounded focus:ring-[#007BFF]"
              required
            />
            <label htmlFor="terms" className="text-sm text-black">
              Мен шарттарды қабылдаймын
            </label>
          </div>

          <PrimaryButton type="submit">
            Жіберу
          </PrimaryButton>
        </form>
      </main>
    </div>
  );
}