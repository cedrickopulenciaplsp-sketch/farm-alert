import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

/**
 * Modal
 *
 * @param {boolean}  isOpen   - controls visibility
 * @param {function} onClose  - called on backdrop click or Escape key
 * @param {string}   title    - dialog heading
 * @param {string}   size     - 'sm' | 'md' | 'lg'
 * @param {ReactNode} children - modal body content
 * @param {ReactNode} footer  - optional footer content (buttons)
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  footer,
}) {
  const panelRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Trap focus inside the modal
  useEffect(() => {
    if (!isOpen) return;
    const el = panelRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) focusable[0].focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const panelSizeClass = size !== 'md' ? styles[size] : '';

  return createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={panelRef}
        className={`${styles.panel} ${panelSizeClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {title && (
          <div className={styles.header}>
            <h2 id="modal-title" className={styles.title}>{title}</h2>
            <button
              id="modal-close-btn"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className={styles.body}>
          {children}
        </div>

        {/* Footer (optional) */}
        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
