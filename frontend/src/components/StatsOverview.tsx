import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { DollarSign, AlertCircle, Calendar, Flame } from 'lucide-react';
import { CostBreakdown } from '../api/client';

interface Props {
  costs: CostBreakdown | null;
  loading: boolean;
}

function AnimatedCounter({ value, prefix = '$', duration = 1500 }: { value: number; prefix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return (
    <span className="ticker-cost font-mono font-bold">
      {prefix}{display.toLocaleString()}
    </span>
  );
}

export default function StatsOverview({ costs, loading }: Props) {
  const { t } = useTranslation();

  const stats = [
    {
      label: t('dashboard.totalDebt'),
      value: costs?.total_cost ?? 0,
      prefix: '$',
      icon: <DollarSign size={20} />,
      color: 'from-red-500/20 to-red-600/10 border-red-500/30',
      iconColor: 'text-red-400',
      animate: true,
    },
    {
      label: t('dashboard.openItems'),
      value: costs?.items_count ?? 0,
      prefix: '',
      icon: <AlertCircle size={20} />,
      color: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
      iconColor: 'text-orange-400',
    },
    {
      label: t('dashboard.monthlyCost'),
      value: costs?.projected_monthly_cost ?? 0,
      prefix: '$',
      icon: <Calendar size={20} />,
      color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
      iconColor: 'text-amber-400',
    },
    {
      label: t('dashboard.criticalItems'),
      value: Object.entries(costs?.by_severity ?? {}).filter(([k]) => k === 'critical' || k === 'high').reduce((acc, [, v]) => acc + (v / (costs?.hourly_rate ?? 150)), 0) || 0,
      prefix: '',
      icon: <Flame size={20} />,
      color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
      iconColor: 'text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
          className={`glass-card p-5 bg-gradient-to-br ${stat.color}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
              {stat.label}
            </span>
            <span className={stat.iconColor}>{stat.icon}</span>
          </div>
          <div className={`text-2xl lg:text-3xl ${stat.iconColor} ${stat.animate ? 'ticker-cost' : ''}`}>
            {stat.animate ? (
              <AnimatedCounter value={stat.value} prefix={stat.prefix} />
            ) : stat.value > 0 ? (
              <span className="font-mono font-bold">{stat.prefix}{Math.round(stat.value).toLocaleString()}</span>
            ) : (
              <span className="font-mono font-bold text-zinc-600">—</span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
