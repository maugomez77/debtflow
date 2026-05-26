import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Flame, BarChart3, Clock, PiggyBank, FolderGit2, LayoutDashboard } from 'lucide-react';
import { Repo } from '../api/client';

type Page = 'dashboard' | 'repos' | 'costs' | 'timeline' | 'roi';

interface Props {
  currentPage: Page;
  onNavigate: (p: Page) => void;
  selectedRepo: Repo | null;
  onSelectRepo: (r: Repo | null) => void;
}

const navItems: { page: Page; icon: React.ReactNode; labelKey: string }[] = [
  { page: 'dashboard', icon: <LayoutDashboard size={20} />, labelKey: 'dashboard.title' },
  { page: 'repos', icon: <FolderGit2 size={20} />, labelKey: 'dashboard.repos' },
  { page: 'costs', icon: <BarChart3 size={20} />, labelKey: 'dashboard.costBreakdown' },
  { page: 'timeline', icon: <Clock size={20} />, labelKey: 'dashboard.debtTimeline' },
  { page: 'roi', icon: <PiggyBank size={20} />, labelKey: 'dashboard.roiCalculator' },
];

export default function Layout({ currentPage, onNavigate, selectedRepo, onSelectRepo }: Props) {
  const { t } = useTranslation();

  return (
    <aside className="w-64 glass border-r border-white/5 flex flex-col shrink-0">
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <Flame className="text-orange-500" size={28} />
          <div>
            <h1 className="text-lg font-bold gradient-text">{t('dashboard.title')}</h1>
            <p className="text-[10px] text-zinc-500 font-medium tracking-wider uppercase">Debt Quantifier</p>
          </div>
        </div>
      </div>

      {selectedRepo && (
        <div className="px-5 py-3 border-b border-white/5">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{t('dashboard.selectRepo')}</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300 truncate">{selectedRepo.name}</span>
            <button
              onClick={() => onSelectRepo(null)}
              className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
            >
              ×
            </button>
          </div>
          <div className="text-[11px] text-zinc-600 mt-0.5 truncate">{selectedRepo.url}</div>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ page, icon, labelKey }) => (
          <motion.button
            key={page}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate(page)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentPage === page
                ? 'gradient-card text-orange-400 glow-orange'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            {icon}
            <span>{t(labelKey)}</span>
          </motion.button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="text-[10px] text-zinc-600 text-center">
          DebtFlow v1.0.0
        </div>
      </div>
    </aside>
  );
}
