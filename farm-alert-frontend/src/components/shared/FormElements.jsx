import styles from './FormElements.module.css';

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------
export function Label({ htmlFor, required = false, children, className = '' }) {
  return (
    <label htmlFor={htmlFor} className={`${styles.label} ${className}`}>
      {children}
      {required && <span className={styles.required} aria-hidden="true">*</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
/**
 * Input
 *
 * @param {string}  type     - HTML input type (default 'text')
 * @param {string}  id       - required; links to Label htmlFor
 * @param {string}  error    - error message string; renders below input when set
 * @param {string}  hint     - helper text rendered below input
 * @param {string}  label    - if set, renders a Label above the input automatically
 * @param {boolean} required - marks the label with a required indicator
 */
export function Input({
  type     = 'text',
  id,
  error,
  hint,
  label,
  required = false,
  className = '',
  ...rest
}) {
  const inputClass = [
    styles.inputBase,
    error ? styles.error : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.field}>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      <input
        id={id}
        type={type}
        className={inputClass}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {error && (
        <span id={`${id}-error`} className={styles.errorMsg} role="alert">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------
/**
 * Select
 *
 * @param {string}     id       - required; links to Label htmlFor
 * @param {string}     error    - error message
 * @param {string}     label    - renders a Label above automatically
 * @param {boolean}    required
 * @param {ReactNode}  children - <option> elements
 */
export function Select({
  id,
  error,
  label,
  required = false,
  className = '',
  children,
  ...rest
}) {
  const selectClass = [
    styles.inputBase,
    styles.select,
    error ? styles.error : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.field}>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      <select
        id={id}
        className={selectClass}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <span id={`${id}-error`} className={styles.errorMsg} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Textarea
// ---------------------------------------------------------------------------
/**
 * Textarea
 *
 * @param {string}     id
 * @param {string}     error
 * @param {string}     hint
 * @param {string}     label
 * @param {boolean}    required
 * @param {number}     rows
 */
export function Textarea({
  id,
  error,
  hint,
  label,
  required = false,
  className = '',
  rows = 3,
  ...rest
}) {
  const textareaClass = [
    styles.inputBase,
    styles.textarea,
    error ? styles.error : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.field}>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      <textarea
        id={id}
        rows={rows}
        className={textareaClass}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {error && (
        <span id={`${id}-error`} className={styles.errorMsg} role="alert">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}
