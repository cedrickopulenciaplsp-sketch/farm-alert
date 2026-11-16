import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Lock, LockOpen as Unlock } from '@phosphor-icons/react';

export default function MapLockControl() {
  const map = useMap();
  const [isLocked, setIsLocked] = useState(true);
  const buttonRef = useRef(null);

  // Prevent map clicks / drag / scroll from propagating through the lock button
  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);

  // Apply the lock state to the map's scroll wheel zoom behavior
  useEffect(() => {
    if (isLocked) {
      map.scrollWheelZoom.disable();
    } else {
      map.scrollWheelZoom.enable();
    }
  }, [isLocked, map]);

  return (
    <button
      ref={buttonRef}
      type="button"
      data-map-control="true"
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 1000,
        background: 'var(--color-surface, #fff)',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1))',
        border: '1px solid var(--color-border, #e2e8f0)',
        cursor: 'pointer',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isLocked ? 'var(--color-text-secondary, #475569)' : 'var(--color-brand, #228b57)',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-overlay, #f1f5f9)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-surface, #fff)'; }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsLocked(prev => !prev);
      }}
      title={isLocked ? "Scroll zoom locked. Click to unlock." : "Scroll zoom unlocked. Click to lock."}
      aria-label={isLocked ? "Unlock scroll zoom" : "Lock scroll zoom"}
    >
      {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
    </button>
  );
}
