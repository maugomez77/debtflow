import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PiggyBank, TrendingUp, Clock, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, Repo, DebtItem, RoiProjection } from '../api/client';

interface Props {
  selectedRepo: Repo | null;
}

export default function RoiCalculator({ selectedRepo }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<DebtItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<DebtItem | null>(null);
  const [roi, setRoi] = useState<RoiProjection | null>(null);

  useEffect(() => {
    api.debt.list({ repo_id: selectedRepo?.id, status: 'open' })
      .then(setItems)
      .catch(() => {});
  }, [selectedRepo]);

  useEffect(() => {
    if (selectedItem) {
      api.roi.get(selectedItem.id).then(setRoi).catch(() => {});
    } else {
      setRoi(null);
    }
  }, [selectedItem]);

  const chartData = roi
    ? [
        { name: t('dashboard.cost'), cost: Math.round(roi.cost_to_fix), fill: '#ef4444' },
        { name: t('dashboard.breakEven'), savings: Math.round(roi.monthly_savings * roi.break_even_months), fill: '#eab308' },
        { name: t('dashboard.oneYear'), savings: Math.round(roi.one_year_savings), fill: '#22c55e' },
        { name: t('dashboard.fiveYears'), savings: Math.round(roi.five_year_savings), fill: '#06b6d4' },
      ]
    : [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">{t('dashboard.roiCalculator')}</h1>
        <p className="text-zinc-500 text-sm mt-1">{t('dashboard.selectRepo')} {t('dashboard.debtItems').toLowerCase()}</p>
      </div>

      <div className="glass-card p-5">
        <label className="text-xs text-zinc-400 mb-2 block">{t('dashboard.debtItems')}</label>
        <select
          value={selectedItem?.id ?? ''}
          onChange={(e) => setSelectedItem(items.find((i) => i.id === e.target.value) ?? null)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
        >
          <option value="">-- Select a debt item --</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              [{item.severity.toUpperCase()}] {item.title} — ${item.estimated_cost.toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      {roi && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <DollarSign size={18} />, label: t('dashboard.cost'), value: `$${roi.cost_to_fix.toLocaleString()}`, color: 'text-red-400' },
              { icon: <TrendingUp size={18} />, label: t('dashboard.savings'), value: `$${roi.monthly_savings.toLocaleString()}/mo`, color: 'text-green-400' },
              { icon: <Clock size={18} />, label: t('dashboard.breakEven'), value: `${roi.break_even_months} mo`, color: 'text-amber-400' },
              { icon: <PiggyBank size={18} />, label: t('dashboard.fiveYears'), value: `$${roi.five_year_savings.toLocaleString()}`, color: 'text-cyan-400' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-4"
              >
                <div className={`${stat.color} mb-2`}>{stat.icon}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{stat.label}</div>
                <div className={`text-lg font-bold font-mono mt-1 ${stat.color}`}>{stat.value}</div>
              </motion.div>
            ))}
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">ROI Comparison</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="name"
                  stroke="#52525b"
                  tick={{ fontSize: 11, fill: '#71717a' }}
                />
                <YAxis
                  stroke="#52525b"
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1e1e2e',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                />
                <Bar dataKey="cost" fill="#ef4444" radius={[6, 6, 0, 0]} />
                <Bar dataKey="savings" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {roi.break_even_months < 6 && (
            <div className="glass-card p-4 border-l-2 border-green-500/30 bg-green-500/5">
              <p className="text-green-400 text-sm font-medium">
                This investment pays for itself in just {roi.break_even_months} months.
                Highly recommended to address soon.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
