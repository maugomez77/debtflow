import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, Repo, TimelinePoint } from '../api/client';

interface Props {
  selectedRepo: Repo | null;
}

export default function Timeline({ selectedRepo }: Props) {
  const { t } = useTranslation();
  const [points, setPoints] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.timeline.get(selectedRepo?.id).then((data) => {
      setPoints(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedRepo]);

  if (loading) return null;

  if (points.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
        <p className="text-zinc-500">{t('dashboard.noDebt')}</p>
      </motion.div>
    );
  }

  const chartData = points.map((p) => ({
    date: new Date(p.date).toLocaleDateString(),
    debt: Math.round(p.total_debt),
    items: p.item_count,
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">{t('dashboard.debtTimeline')}</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {points.length} snapshots · {selectedRepo?.name ?? t('dashboard.allRepos')}
        </p>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Total Debt Over Time</h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              stroke="#52525b"
              tick={{ fontSize: 11, fill: '#71717a' }}
              tickLine={false}
            />
            <YAxis
              stroke="#52525b"
              tick={{ fontSize: 11, fill: '#71717a' }}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: '#1e1e2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [
                name === 'debt' ? `$${value.toLocaleString()}` : value,
                name === 'debt' ? 'Debt' : 'Items',
              ]}
            />
            <Area
              type="monotone"
              dataKey="debt"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#debtGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {points.map((point, i) => (
          <motion.div
            key={point.date}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-4"
          >
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {new Date(point.date).toLocaleDateString()}
            </div>
            <div className="text-lg font-bold font-mono text-zinc-200 mt-1">
              ${point.total_debt.toLocaleString()}
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-zinc-600">{point.item_count} items</span>
              <span className={point.change_from_previous > 0 ? 'text-red-400' : 'text-green-400'}>
                {point.change_from_previous > 0 ? '+' : ''}{point.change_from_previous.toLocaleString()}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
