import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useUserName } from './hooks/useUserName';
import { Sidebar } from './components/Sidebar';
import { NamePrompt } from './components/NamePrompt';
import { HomePage } from './pages/HomePage';
import { VocabularyPage } from './pages/VocabularyPage';
import { GamePage } from './pages/GamePage';
import './App.css';

export function App() {
  const { name, setName, hasName } = useUserName();
  const navigate = useNavigate();

  // First visit: show name prompt before anything else
  if (!hasName) {
    return (
      <NamePrompt
        onSubmit={(newName) => {
          setName(newName);
          navigate('/', { replace: true });
        }}
      />
    );
  }

  return (
    <div className="app-layout">
      <Sidebar userName={name!} onUpdateName={setName} />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/vocabulary" element={<VocabularyPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
