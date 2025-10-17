import { useState } from 'react';
import { HomePage } from './components/HomePage';
import { RegistrationPage } from './components/RegistrationPage';
import { SuccessPage } from './components/SuccessPage';
import { ResultsPage } from './components/ResultsPage';
import { InfoPage } from './components/InfoPage';
import { SchedulePage } from './components/SchedulePage';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState('login');

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  return (
    <div className="size-full">
      {currentPage === 'login' && (
        <LoginPage onNavigate={handleNavigate} />
      )}
      {currentPage === 'signup' && (
        <SignupPage onNavigate={handleNavigate} />
      )}
      {currentPage === 'home' && (
        <HomePage onNavigate={handleNavigate} />
      )}
      {currentPage === 'registration' && (
        <RegistrationPage onNavigate={handleNavigate} />
      )}
      {currentPage === 'success' && (
        <SuccessPage onNavigate={handleNavigate} />
      )}
      {currentPage === 'results' && (
        <ResultsPage onNavigate={handleNavigate} />
      )}
      {currentPage === 'info' && (
        <InfoPage onNavigate={handleNavigate} />
      )}
      {currentPage === 'schedule' && (
        <SchedulePage onNavigate={handleNavigate} />
      )}
    </div>
  );
}