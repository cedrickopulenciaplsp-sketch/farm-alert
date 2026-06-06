/**
 * MiniDiseaseChart.jsx
 * Reusable "Cases by Disease" donut/pie chart (Recharts).
 * Accepts pre-computed `data` array as a prop.
 *
 * data shape: [{ disease_name: 'ASF', case_count: 5 }, ...]
 */
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6'];

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
          width: 120, height: 120, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-overlay) 0%, var(--color-canvas) 100%)',
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
    );
  }

  if (!data.length) return <EmptyChart />;

  const total = data.reduce((s, d) => s + d.case_count, 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={50}
          outerRadius={78}
          paddingAngle={3}
          dataKey="case_count"
          nameKey="disease_name"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v, name) => [`${v} case${v !== 1 ? 's' : ''}`, name]}
          contentStyle={{
            borderRadius: '10px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            fontSize: 12,
            padding: '8px 12px',
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={name => (
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{name}</span>
          )}
          wrapperStyle={{ paddingTop: 4 }}
          payload={data.map((d, i) => ({
            value: d.disease_name,
            type: 'circle',
            color: COLORS[i % COLORS.length],
          }))}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
