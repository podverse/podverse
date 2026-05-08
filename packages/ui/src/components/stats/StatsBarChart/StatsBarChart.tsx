'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import styles from './StatsBarChart.module.scss';

export type StatsBarChartDatum = {
  label: string;
  value: number;
};

export type StatsBarChartProps = {
  data: StatsBarChartDatum[];
  /** Localized Y-axis / tooltip series name (Recharts tooltip formatter). */
  valueLabel: string;
  loading?: boolean;
  emptyMessage: string;
  /** Shown while `loading` is true. */
  loadingLabel: string;
};

export function StatsBarChart({
  data,
  emptyMessage,
  loading = false,
  loadingLabel,
  valueLabel,
}: StatsBarChartProps) {
  if (loading) {
    return <div className={styles.loading}>{loadingLabel}</div>;
  }

  if (data.length === 0) {
    return <div className={styles.empty}>{emptyMessage}</div>;
  }

  const formatTooltipValue = (value: unknown): number => {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      return Number(value);
    }
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      return typeof first === 'number' ? first : Number(first);
    }
    return Number.NaN;
  };

  return (
    <div className={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            formatter={(value: unknown) => {
              const numeric = formatTooltipValue(value);
              return [numeric.toLocaleString(), valueLabel];
            }}
          />
          <Bar dataKey="value" fill="var(--border-color-primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
