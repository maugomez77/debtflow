import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { api, Repo } from '../api/client';

interface Props {
  onSelectRepo: (repo: Repo) => void;
}

export default function RepoList({ onSelectRepo }: Props) {
  const { t } = useTranslation();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoName, setRepoName] = useState('');
  const [repoBranch, setRepoBranch] = useState('main');

  const loadRepos = async () => {
    setLoading(true);
    try {
      const data = await api.repos.list();
      setRepos(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRepos(); }, []);

  const handleScan = async () => {
    if (!repoUrl) return;
    setScanning(true);
    try {
      await api.repos.scan({ url: repoUrl, branch: repoBranch });
      toast.success('Repository scanned successfully!');
      setShowForm(false);
      setRepoUrl('');
      setRepoName('');
      await loadRepos();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.repos.delete(id);
      toast.success('Repository removed');
      await loadRepos();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getHealthScore = (debt: number): { score: number; color: string; label: string } => {
    if (debt === 0) return { score: 100, color: 'text-green-400', label: 'Excellent' };
    if (debt < 10000) return { score: 80, color: 'text-green-400', label: 'Good' };
    if (debt < 50000) return { score: 55, color: 'text-yellow-400', label: 'Fair' };
    if (debt < 100000) return { score: 30, color: 'text-orange-400', label: 'Poor' };
    return { score: 10, color: 'text-red-400', label: 'Critical' };
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">{t('dashboard.repos')}</h1>
          <p className="text-zinc-500 text-sm mt-1">{t('dashboard.scanFirst')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="gradient-bg text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          {t('dashboard.scanRepo')}
        </button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-card p-5 space-y-3"
        >
          <div>
            <label className="block text-xs text-zinc-400 mb-1">{t('dashboard.repoUrl')}</label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-zinc-400 mb-1">{t('dashboard.branch')}</label>
              <input
                type="text"
                value={repoBranch}
                onChange={(e) => setRepoBranch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleScan}
              disabled={scanning || !repoUrl}
              className="gradient-bg text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {scanning ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {scanning ? t('dashboard.scanning') : t('dashboard.scan')}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="glass-card px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {repos.length === 0 && !loading ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📂</div>
          <p className="text-zinc-400 text-lg">{t('dashboard.noRepos')}</p>
          <p className="text-zinc-600 text-sm mt-1">{t('dashboard.addRepo')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {repos.map((repo, i) => {
            const health = getHealthScore(repo.total_debt);
            return (
              <motion.div
                key={repo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelectRepo(repo)}
                className="glass-card p-5 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-zinc-200 group-hover:text-orange-400 transition-colors">{repo.name}</h3>
                    <p className="text-zinc-600 text-xs font-mono mt-0.5">{repo.url}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-lg font-bold font-mono ${health.color}`}>
                        ${repo.total_debt?.toLocaleString() ?? '0'}
                      </div>
                      <div className={`text-xs ${health.color}`}>{health.label}</div>
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-white/10 flex items-center justify-center relative">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="14" fill="none"
                          stroke={health.score > 70 ? '#4ade80' : health.score > 40 ? '#facc15' : '#f87171'}
                          strokeWidth="3"
                          strokeDasharray={`${health.score * 0.88} 88`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className={`absolute text-xs font-bold ${health.color}`}>{health.score}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(repo.id); }}
                      className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-600 mt-2">
                  {t('dashboard.lastScanned')}: {repo.last_scanned ? new Date(repo.last_scanned).toLocaleDateString() : t('dashboard.never')}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
