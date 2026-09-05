import React, { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { Lock, Unlock } from 'lucide-react';

export default function MapLockControl() {
  const map = useMap();
  const [isLocked, setIsLocked] = useState(true);

  // Apply the lock state to the map's scroll wheel zoom behavior
  useEffect(() => {
    if (isLocked) {
      map.scrollWheelZoom.disable();
    } else {
      map.scrollWheelZoom.enable();
    }
  }, [isLocked, map]);

  return (
    <div 
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
      onClick={(e) => {
        e.stopPropagation();
        setIsLocked(!isLocked);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      title={isLocked ? "Scroll zoom locked. Click to unlock." : "Scroll zoom unlocked. Click to lock."}
    >
      {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
    </div>
  );
}
