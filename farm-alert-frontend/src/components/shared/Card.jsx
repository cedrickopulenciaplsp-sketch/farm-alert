import styles from './Card.module.css';

// ---------------------------------------------------------------------------
// Card sub-components
// ---------------------------------------------------------------------------
function CardHeader({ title, children, className = '' }) {
  return (
    <div className={`${styles.header} ${className}`}>
      {title && <h2 className={styles.headerTitle}>{title}</h2>}
      {children}
    </div>
  );
}

function CardBody({ children, className = '' }) {
  return (
    <div className={`${styles.body} ${className}`}>
      {children}
    </div>
  );
}

function CardFooter({ children, className = '' }) {
  return (
    <div className={`${styles.footer} ${className}`}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card root
// ---------------------------------------------------------------------------
/**
 * Card
 *
 * @param {boolean}  hoverable - enables translateY lift + shadow upgrade on hover
 * @param {string}   className - extra class names
 */
function Card({ hoverable = false, className = '', children, ...rest }) {
  const classes = [
    styles.card,
    hoverable ? styles.hoverable : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

// Attach sub-components as static properties
Card.Header = CardHeader;
Card.Body   = CardBody;
Card.Footer = CardFooter;

export default Card;
