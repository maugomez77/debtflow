import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import RepoList from './components/RepoList';
import CostBreakdown from './components/CostBreakdown';
import Timeline from './components/Timeline';
import RoiCalculator from './components/RoiCalculator';
import LanguageSwitcher from './components/LanguageSwitcher';
import { Repo } from './api/client';

type Page = 'dashboard' | 'repos' | 'costs' | 'timeline' | 'roi';

function App() {
  const { t } = useTranslation();
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard selectedRepo={selectedRepo} />;
      case 'repos':
        return <RepoList onSelectRepo={(repo) => { setSelectedRepo(repo); setPage('dashboard'); }} />;
      case 'costs':
        return <CostBreakdown selectedRepo={selectedRepo} />;
      case 'timeline':
        return <Timeline selectedRepo={selectedRepo} />;
      case 'roi':
        return <RoiCalculator selectedRepo={selectedRepo} />;
    }
  };

  return (
    <div className="flex h-screen bg-surface-950">
      <LanguageSwitcher />
      <Layout
        currentPage={page}
        onNavigate={setPage}
        selectedRepo={selectedRepo}
        onSelectRepo={setSelectedRepo}
      />
      <main className="flex-1 overflow-y-auto p-6">
        {renderPage()}
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e1e2e',
            color: '#e2e8f0',
            border: '1px solid rgba(249, 115, 22, 0.2)',
          },
        }}
      />
    </div>
  );
}

export default App;
