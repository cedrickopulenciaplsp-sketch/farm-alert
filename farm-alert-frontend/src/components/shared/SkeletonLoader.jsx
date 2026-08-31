/**
 * SkeletonLoader
 *
 * Renders shimmer placeholder rows for table/list loading states.
 * Uses the global `.skeleton` class from index.css for the shimmer animation.
 *
 * Props:
 *   rows     {number}  - Number of skeleton rows to render (default: 5)
 *   columns  {number}  - Number of columns per row (default: 4)
 *   type     {string}  - 'table' | 'card' | 'list' (default: 'table')
 */

const styles = {
  /* ── Table skeleton ── */
  tableWrapper: {
    width: '100%',
    padding: '0',
  },
  headerRow: {
    display: 'flex',
    gap: '1rem',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-overlay)',
  },
  headerCell: {
    height: '10px',
    borderRadius: '4px',
    flex: 1,
  },
  bodyRow: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    padding: '0.9rem 1rem',
    borderBottom: '1px solid var(--color-border)',
  },
  bodyCell: {
    height: '14px',
    borderRadius: '6px',
    flex: 1,
  },
  bodyCellShort: {
    height: '14px',
    borderRadius: '6px',
    flex: '0 0 80px',
  },
  bodyCellBadge: {
    height: '22px',
    borderRadius: '999px',
    flex: '0 0 72px',
  },
  /* ── Card skeleton ── */
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1.25rem',
  },
  cardItem: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    boxShadow: 'var(--shadow-sm)',
  },
  cardIcon: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--radius-lg)',
  },
  cardTitle: {
    height: '20px',
    borderRadius: '6px',
    width: '60%',
  },
  cardText: {
    height: '14px',
    borderRadius: '4px',
  },
  cardTextShort: {
    height: '14px',
    borderRadius: '4px',
    width: '40%',
  },
  /* ── List skeleton ── */
  listWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem 1.5rem',
    borderBottom: '1px solid var(--color-border)',
  },
  listAvatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  listContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  listTitle: {
    height: '13px',
    borderRadius: '4px',
    width: '55%',
  },
  listSub: {
    height: '11px',
    borderRadius: '4px',
    width: '35%',
  },
  listBadge: {
    width: '60px',
    height: '20px',
    borderRadius: '999px',
    flexShrink: 0,
  },
};

// Column width distribution for table skeleton variety
const colWidths = ['flex: 2', 'flex: 1', 'flex: 1', 'flex: 1', 'flex: 0 0 80px'];

export default function SkeletonLoader({ rows = 5, columns = 4, type = 'table' }) {
  if (type === 'card') {
    return (
      <div style={styles.cardGrid} aria-busy="true" aria-label="Loading…">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={styles.cardItem}>
            <div className="skeleton" style={styles.cardIcon} />
            <div className="skeleton" style={styles.cardTitle} />
            <div className="skeleton" style={styles.cardText} />
            <div className="skeleton" style={styles.cardTextShort} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div style={styles.listWrapper} aria-busy="true" aria-label="Loading…">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={styles.listItem}>
            <div className="skeleton" style={styles.listAvatar} />
            <div style={styles.listContent}>
              <div className="skeleton" style={styles.listTitle} />
              <div className="skeleton" style={styles.listSub} />
            </div>
            <div className="skeleton" style={styles.listBadge} />
          </div>
        ))}
      </div>
    );
  }

  // Default: table
  const cols = Array.from({ length: columns });
  return (
    <div style={styles.tableWrapper} aria-busy="true" aria-label="Loading…">
      {/* Header row */}
      <div style={styles.headerRow}>
        {cols.map((_, c) => (
          <div
            key={c}
            className="skeleton"
            style={{
              ...styles.headerCell,
              ...(c === 0 ? { flex: 2 } : {}),
              opacity: 0.5,
            }}
          />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={styles.bodyRow}>
          {cols.map((_, c) => {
            // Last column gets a badge shape, others get text lines
            const isLast = c === columns - 1;
            const isFirst = c === 0;
            return (
              <div
                key={c}
                className="skeleton"
                style={{
                  ...(isLast
                    ? styles.bodyCellBadge
                    : isFirst
                    ? { ...styles.bodyCell, flex: 2 }
                    : styles.bodyCell),
                  animationDelay: `${(r * columns + c) * 30}ms`,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
