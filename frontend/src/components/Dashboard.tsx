import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { api, Repo, CostBreakdown as CostBreakdownType, AiRecommendation } from '../api/client';
import StatsOverview from './StatsOverview';
import DebtCard from './DebtCard';

interface Props {
  selectedRepo: Repo | null;
}

export default function Dashboard({ selectedRepo }: Props) {
  const { t } = useTranslation();
  const [costs, setCosts] = useState<CostBreakdownType | null>(null);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, r] = await Promise.all([
        api.costs.get(selectedRepo?.id),
        api.ai.recommend(selectedRepo?.id),
      ]);
      setCosts(c);
      setRecommendations(r);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedRepo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw size={32} className="text-orange-500" />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle size={48} className="text-red-400" />
        <p className="text-zinc-400">{t('dashboard.error')}</p>
        <p className="text-zinc-600 text-sm">{error}</p>
        <button onClick={loadData} className="glass-card px-4 py-2 text-sm text-orange-400 hover:text-orange-300 transition-colors">
          {t('dashboard.retry')}
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">{t('dashboard.title')}</h1>
          <p className="text-zinc-500 text-sm mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <button
          onClick={loadData}
          className="glass-card px-4 py-2 flex items-center gap-2 text-sm text-zinc-400 hover:text-orange-400 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {t('dashboard.reload')}
        </button>
      </div>

      <StatsOverview costs={costs} loading={loading} />

      {recommendations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            {t('dashboard.aiRecommendations')}
          </h2>
          <div className="grid gap-3">
            {recommendations.map((rec, i) => (
              <motion.div
                key={rec.item_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-zinc-200 text-sm">{rec.title}</h3>
                    <p className="text-zinc-500 text-xs mt-1">{rec.reason}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    rec.urgency_score > 70 ? 'bg-red-500/20 text-red-400' :
                    rec.urgency_score > 40 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {rec.urgency_score.toFixed(1)} pts
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <DebtCard selectedRepo={selectedRepo} />
    </motion.div>
  );
}
