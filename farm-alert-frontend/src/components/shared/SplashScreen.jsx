import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import styles from './SplashScreen.module.css';

/**
 * SplashScreen — a branded overlay shown for ~2 seconds when the app first loads.
 * After the loading bar animation completes, it fades out and unmounts.
 */
export default function SplashScreen({ onFinish }) {
  const [hiding, setHiding] = useState(false);
  const [unmounted, setUnmounted] = useState(false);

  useEffect(() => {
    // Start fade-out after the loading bar finishes (~2s)
    const fadeTimer = setTimeout(() => setHiding(true), 2000);
    // Fully unmount after the 0.6s CSS fade transition
    const unmountTimer = setTimeout(() => {
      setUnmounted(true);
      onFinish?.();
    }, 2600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, [onFinish]);

  if (unmounted) return null;

  return (
    <div className={`${styles.overlay} ${hiding ? styles.overlayHidden : ''}`}>
      <div className={styles.iconRing}>
        <Shield size={38} className={styles.shieldIcon} />
      </div>
      <p className={styles.brandName}>FarmAlert</p>
      <p className={styles.brandSub}>City Veterinary Office</p>
      <div className={styles.loadingBar}>
        <div className={styles.loadingFill} />
      </div>
    </div>
  );
}
