import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, RefreshCw, AlertCircle,
  ChevronLeft, ChevronRight, Activity,
} from 'lucide-react';
import { getAuditLogs } from '../../services/admin';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import styles from './AuditLogs.module.css';

const PAGE_SIZE = 30;

// ── Target table badge ────────────────────────────────────────────────────────
const TABLE_COLORS = {
  users:           { bg: 'hsla(217,91%,60%,0.1)',  color: 'hsl(217,65%,48%)' },
  farms:           { bg: 'hsla(145,58%,28%,0.1)',  color: 'hsl(145,58%,28%)' },
  disease_reports: { bg: 'hsla(4,74%,49%,0.1)',   color: 'hsl(4,74%,45%)'  },
  system_settings: { bg: 'hsla(45,90%,50%,0.1)',  color: 'hsl(38,80%,35%)' },
  pest_control_logs: { bg: 'hsla(280,60%,55%,0.1)', color: 'hsl(280,50%,45%)' },
};

function TableBadge({ table }) {
  if (!table) return <span className={styles.noTable}>—</span>;
  const palette = TABLE_COLORS[table] ?? { bg: 'var(--color-overlay)', color: 'var(--color-text-muted)' };
  return (
    <span className={styles.tableBadge} style={{ background: palette.bg, color: palette.color }}>
      {table}
    </span>
  );
}

// ── Log row ───────────────────────────────────────────────────────────────────
function LogRow({ log }) {
  const ts = new Date(log.created_at).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  return (
    <tr className={styles.row}>
      <td className={styles.cell}>{log.log_id}</td>
      <td className={styles.cellAction}>
        <div className={styles.actionIcon}><Activity size={12} /></div>
        <span>{log.action}</span>
      </td>
      <td className={styles.cell}><TableBadge table={log.target_table} /></td>
      <td className={styles.cell}>
        {log.target_id
          ? <code className={styles.targetId}>{log.target_id.slice(0, 8)}…</code>
          : '—'
        }
      </td>
      <td className={styles.cell}>{log.users?.full_name ?? <span className={styles.system}>System</span>}</td>
      <td className={styles.cell}>{ts}</td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AuditLogs() {
  const [logs,    setLogs]    = useState([]);
  const [count,   setCount]   = useState(0);
  const [page,    setPage]    = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, count: total, error: e } = await getAuditLogs({ page, pageSize: PAGE_SIZE });
    if (e) { setError(e.message); setLoading(false); return; }
    setLogs(data ?? []);
    setCount(total ?? 0);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className={styles.page}>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <p className={styles.hint}>
          Immutable activity log of all significant system actions. Read-only.
        </p>
        <Button id="refresh-logs-btn" variant="ghost" size="sm" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {error ? (
        <Card>
          <Card.Body className={styles.errorBody}>
            <AlertCircle size={20} />
            <p>{error}</p>
            <Button id="retry-logs-btn" variant="ghost" size="sm" onClick={load}>
              <RefreshCw size={14} /> Retry
            </Button>
          </Card.Body>
        </Card>
      ) : loading ? (
        <div className={styles.loadingWrapper}><LoadingSpinner size={36} /></div>
      ) : logs.length === 0 ? (
        <Card>
          <Card.Body className={styles.emptyBody}>
            <ClipboardList size={28} />
            <p>No audit log entries yet.</p>
            <p className={styles.emptyHint}>Actions performed by admins will appear here.</p>
          </Card.Body>
        </Card>
      ) : (
        <Card className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table} aria-label="Audit logs table">
              <thead>
                <tr>
                  <th className={styles.th}>#</th>
                  <th className={styles.th}>Action</th>
                  <th className={styles.th}>Table</th>
                  <th className={styles.th}>Record ID</th>
                  <th className={styles.th}>User</th>
                  <th className={styles.th}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => <LogRow key={log.log_id} log={log} />)}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className={styles.tableFooter}>
            <span className={styles.count}>
              {count} total entr{count !== 1 ? 'ies' : 'y'}
              {' '}· Page {page + 1} of {totalPages}
            </span>
            <div className={styles.pagination}>
              <button
                id="logs-prev-btn"
                className={styles.pageBtn}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label="Previous page"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                id="logs-next-btn"
                className={styles.pageBtn}
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                aria-label="Next page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
