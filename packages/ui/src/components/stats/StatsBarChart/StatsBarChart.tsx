'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import styles from './StatsBarChart.module.scss';

export type StatsBarChartDatum = {
  label: string;
  value: number;
};

export type StatsBarChartProps = {
  data: StatsBarChartDatum[];
  valueLabel?: string;
  loading?: boolean;
  emptyMessage?: string;
};

export function StatsBarChart({
  data,
  valueLabel = 'Count',
  loading = false,
  emptyMessage = 'No data available.',
}: StatsBarChartProps) {
  if (loading) {
    return <div className={styles.loading}>Loading chart...</div>;
  }

  if (data.length === 0) {
    return <div className={styles.empty}>{emptyMessage}</div>;
  }

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
            formatter={
              ((value: number | string) => [Number(value).toLocaleString(), valueLabel]) as never
            }
          />
          <Bar dataKey="value" fill="var(--pv-color-primary, #6c5ce7)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
