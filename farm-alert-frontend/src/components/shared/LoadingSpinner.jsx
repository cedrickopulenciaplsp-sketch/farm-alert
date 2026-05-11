import { Loader2 } from 'lucide-react';

/**
 * LoadingSpinner
 *
 * @param {number} size    - icon size in px (default 24)
 * @param {string} color   - CSS color value (default: var(--color-brand))
 * @param {string} label   - sr-only accessible label
 */
export default function LoadingSpinner({
  size  = 24,
  color = 'var(--color-brand)',
  label = 'Loading…',
}) {
  return (
    <span role="status" aria-label={label} style={{ display: 'inline-flex' }}>
      <Loader2
        size={size}
        color={color}
        aria-hidden="true"
        style={{ animation: 'btn-spin 0.7s linear infinite' }}
      />
      <span style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
        borderWidth: 0,
      }}>
        {label}
      </span>
    </span>
  );
}
