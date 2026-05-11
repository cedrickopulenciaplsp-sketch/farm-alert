import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

/**
 * Button
 *
 * @param {string}   variant  - 'primary' | 'secondary' | 'danger' | 'ghost'
 * @param {string}   size     - 'sm' | 'md' | 'lg'
 * @param {boolean}  loading  - shows spinner and disables interaction
 * @param {boolean}  disabled
 * @param {string}   id       - required for accessibility / testing
 * @param {ReactNode} children
 */
export default function Button({
  variant = 'primary',
  size    = 'md',
  loading = false,
  disabled = false,
  id,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    styles.btn,
    styles[variant],
    styles[size],
    loading ? styles.loading : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      id={id}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading && (
        <Loader2
          size={14}
          className={styles.spinner}
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
