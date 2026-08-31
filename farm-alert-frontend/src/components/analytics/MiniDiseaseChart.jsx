/**
 * MiniDiseaseChart.jsx
 * Reusable "Cases by Disease" horizontal bar chart (Recharts).
 * Accepts pre-computed `data` array as a prop.
 *
 * data shape: [{ disease_name: 'ASF', case_count: 5 }, ...]
 */
import {
  BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const COLORS = ['#1d3557', '#e07a5f', '#2a9d8f', '#e9c46a', '#457b9d', '#264653'];

function EmptyChart() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 8,
      color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)',
    }}>
      <p>No disease data for this period.</p>
    </div>
  );
}

/**
 * @param {object}  props
 * @param {Array}   props.data      – Array of { disease_name, case_count }.
 * @param {boolean} props.loading   – Show a shimmer state while loading.
 * @param {number}  props.height    – Chart height in px (default 240).
 */
export default function MiniDiseaseChart({ data = [], loading = false, height = 240 }) {
  if (loading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '90%', height: '70%',
          background: 'linear-gradient(90deg, var(--color-overlay) 25%, var(--color-canvas) 50%, var(--color-overlay) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          borderRadius: 8,
        }} />
      </div>
    );
  }

  if (!data.length) return <EmptyChart />;

  const chartData = data.slice(0, 6);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, bottom: 5, left: 10 }}
      >
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="disease_name"
          width={120}
          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(v) => [`${v} case${v !== 1 ? 's' : ''}`, 'Reported']}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            background: 'rgba(255,255,255,0.95)',
            fontSize: 12,
            padding: '6px 10px',
          }}
        />
        <Bar dataKey="case_count" radius={[0, 4, 4, 0]} barSize={18}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
