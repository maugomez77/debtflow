import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, CheckCircle2, Clock, AlertTriangle, Flame } from 'lucide-react';
import { api, Repo, DebtItem } from '../api/client';

interface Props {
  selectedRepo: Repo | null;
}

const severityIcons: Record<string, React.ReactNode> = {
  critical: <Flame size={14} className="text-red-500" />,
  high: <AlertTriangle size={14} className="text-orange-500" />,
  medium: <Clock size={14} className="text-yellow-500" />,
  low: <CheckCircle2 size={14} className="text-green-500" />,
};

const severityStyles: Record<string, string> = {
  critical: 'border-red-500/30 bg-red-500/5',
  high: 'border-orange-500/30 bg-orange-500/5',
  medium: 'border-yellow-500/30 bg-yellow-500/5',
  low: 'border-green-500/30 bg-green-500/5',
};

export default function DebtCard({ selectedRepo }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<DebtItem[]>([]);
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await api.debt.list({
        repo_id: selectedRepo?.id,
        status: filter === 'all' ? undefined : filter,
      });
      setItems(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, [selectedRepo, filter]);

  const filtered = items.filter(
    (item) =>
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.file_path.toLowerCase().includes(search.toLowerCase())
  );

  const handleResolve = async (id: string) => {
    try {
      await api.debt.resolve(id);
      toast.success(t('fixIt') + '!');
      await loadItems();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-zinc-300">{t('dashboard.debtItems')}</h2>
        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
          {['all', 'open', 'resolved'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                filter === f ? 'bg-orange-500/20 text-orange-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t(`dashboard.${f}`)}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('dashboard.search')}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/30"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 && !loading ? (
        <div className="text-center py-12 glass-card">
          <p className="text-zinc-500">{t('dashboard.noDebt')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
                className={`glass-card p-4 border-l-2 ${severityStyles[item.severity] || severityStyles.medium}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {severityIcons[item.severity]}
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                        item.severity === 'critical' ? 'text-red-400' :
                        item.severity === 'high' ? 'text-orange-400' :
                        item.severity === 'medium' ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {item.severity}
                      </span>
                      {item.status === 'resolved' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">
                          {t('dashboard.resolvedBadge')}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-zinc-200 text-sm truncate">{item.title}</h3>
                    <p className="text-zinc-600 text-xs font-mono mt-0.5">{item.file_path}</p>
                    {item.description && (
                      <p className="text-zinc-600 text-xs mt-1 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[10px] text-zinc-500">
                        {item.estimated_hours}h · ${item.estimated_cost?.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        Churn: {item.churn_score?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {item.status === 'open' && (
                    <button
                      onClick={() => handleResolve(item.id)}
                      className="shrink-0 gradient-bg text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                    >
                      <CheckCircle2 size={14} />
                      {t('dashboard.payOff')}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
