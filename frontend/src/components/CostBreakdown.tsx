import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { api, Repo, CostBreakdown as CostBreakdownType } from '../api/client';

interface Props {
  selectedRepo: Repo | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  unknown: '#6b7280',
};

const CATEGORY_COLORS = ['#f97316', '#eab308', '#8b5cf6', '#06b6d4', '#22c55e', '#ef4444', '#ec4899', '#6b7280'];

export default function CostBreakdown({ selectedRepo }: Props) {
  const { t } = useTranslation();
  const [costs, setCosts] = useState<CostBreakdownType | null>(null);

  useEffect(() => {
    api.costs.get(selectedRepo?.id).then(setCosts).catch(() => {});
  }, [selectedRepo]);

  if (!costs || costs.items_count === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
        <p className="text-zinc-500">{t('dashboard.noDebt')}</p>
      </motion.div>
    );
  }

  const severityData = Object.entries(costs.by_severity).map(([name, value]) => ({
    name: name.toUpperCase(),
    value: Math.round(value),
  }));

  const categoryData = Object.entries(costs.by_category).map(([name, value]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    value: Math.round(value),
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">{t('dashboard.costBreakdown')}</h1>
        <p className="text-zinc-500 text-sm mt-1">
          ${costs.total_cost.toLocaleString()} total · ${costs.hourly_rate}/hr · {costs.total_hours}h
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">By Severity</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {severityData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={SEVERITY_COLORS[entry.name.toLowerCase()] || '#6b7280'}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1e1e2e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {severityData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: SEVERITY_COLORS[entry.name.toLowerCase()] }}
                />
                <span className="text-[11px] text-zinc-400">{entry.name}</span>
                <span className="text-[11px] text-zinc-500 font-mono">${entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">By Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {categoryData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1e1e2e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {categoryData.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                />
                <span className="text-[11px] text-zinc-400">{entry.name}</span>
                <span className="text-[11px] text-zinc-500 font-mono">${entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('dashboard.totalDebt')}</div>
            <div className="text-xl font-bold text-red-400 font-mono">${costs.total_cost.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('dashboard.monthlyCost')}</div>
            <div className="text-xl font-bold text-amber-400 font-mono">${costs.projected_monthly_cost.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('dashboard.hours')}</div>
            <div className="text-xl font-bold text-zinc-300 font-mono">{costs.total_hours}</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('dashboard.openItems')}</div>
            <div className="text-xl font-bold text-zinc-300 font-mono">{costs.items_count}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
