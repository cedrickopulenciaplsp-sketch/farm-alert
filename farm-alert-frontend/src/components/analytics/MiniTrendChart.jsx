/**
 * MiniTrendChart.jsx
 * Reusable "Monthly Case & Mortality Trend" line chart (Recharts).
 * Accepts pre-computed `trends` array as a prop.
 *
 * trends shape: [{ month: 'Jan 25', cases: 4, deaths: 1 }, ...]
 */
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

function EmptyChart() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 8,
      color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)',
    }}>
      <p>No cases recorded yet.</p>
    </div>
  );
}

/**
 * @param {object}  props
 * @param {Array}   props.trends    – Derived monthly trend data.
 * @param {boolean} props.loading   – Show a shimmer state while loading.
 * @param {number}  props.height    – Chart height in px (default 240).
 */
export default function MiniTrendChart({ trends = [], loading = false, height = 240 }) {
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

  if (!trends.length) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={trends} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="caseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="hsl(152,58%,28%)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="hsl(152,58%,28%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '10px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            fontSize: 12,
            padding: '8px 12px',
          }}
          formatter={(value, name) => [value, name === 'cases' ? 'Cases' : 'Deaths']}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={name => (
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              {name === 'cases' ? 'Cases' : 'Deaths'}
            </span>
          )}
          wrapperStyle={{ paddingTop: 4 }}
        />
        <Line
          type="monotone"
          dataKey="cases"
          stroke="hsl(152,58%,28%)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: 'hsl(152,58%,28%)' }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="deaths"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="4 2"
          dot={{ r: 3, fill: '#ef4444' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
