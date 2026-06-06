import { useState, useEffect, useCallback } from 'react';
import { getMapFarms } from '../../services/analytics';
import { useRealtime } from '../../hooks/useRealtime';
import { Activity } from 'lucide-react';
import MapWidget from '../../components/map/MapWidget';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Card from '../../components/shared/Card';
import styles from './DiseaseMap.module.css';

// ---------------------------------------------------------------------------
// DiseaseMap — main page
// ---------------------------------------------------------------------------
export default function DiseaseMap() {
  const [farms, setFarms]     = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFarms = useCallback(async () => {
    const { data } = await getMapFarms();
    if (data) setFarms(data.filter(f => f.latitude && f.longitude));
    setLoading(false);
  }, []);

  useEffect(() => { loadFarms(); }, [loadFarms]);

  useRealtime('disease_reports', () => loadFarms());
  useRealtime('farms',           () => loadFarms());

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <LoadingSpinner size={40} />
      </div>
    );
  }

  const infectedFarms    = farms.filter(f => f.latest_report_status === 'Active');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Disease Map</h1>
          <p className={styles.pageSubtitle}>Geospatial view of all registered farms and active incidents</p>
        </div>
      </header>

      <div className={styles.mapLayout}>
        {/* ── Map ─────────────────────────────────────────────────────────── */}
        <div className={styles.mapContainer}>
          <MapWidget
            farms={farms}
            zoom={13}
            className={styles.map}
          />
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className={styles.sidebar}>
          <Card className={styles.legendCard}>
            <Card.Header title="Map Legend" />
            <Card.Body>
              <ul className={styles.legendList}>
                <li className={styles.legendItem}>
                  <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png" alt="Green marker" className={styles.legendPin} />
                  <div className={styles.legendText}>
                    <span className={styles.legendLabel}>Healthy / Active</span>
                    <span className={styles.legendDesc}>Farm is operational with no active disease incident.</span>
                  </div>
                  <span className={styles.legendCount}>{farms.filter(f => f.farm_status === 'Active' && f.latest_report_status !== 'Active').length}</span>
                </li>
                <li className={styles.legendItem}>
                  <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png" alt="Red marker" className={styles.legendPin} />
                  <div className={styles.legendText}>
                    <span className={styles.legendLabel}>Active Incident / Quarantine</span>
                    <span className={styles.legendDesc}>Farm has an active disease report or is under quarantine.</span>
                  </div>
                  <span className={styles.legendCount}>{farms.filter(f => f.farm_status === 'Quarantine' || f.latest_report_status === 'Active').length}</span>
                </li>
                <li className={styles.legendItem}>
                  <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png" alt="Black marker" className={styles.legendPin} />
                  <div className={styles.legendText}>
                    <span className={styles.legendLabel}>Temporarily Closed</span>
                    <span className={styles.legendDesc}>Farm has been temporarily closed and is not operational.</span>
                  </div>
                  <span className={styles.legendCount}>{farms.filter(f => f.farm_status === 'Temporarily Closed').length}</span>
                </li>
              </ul>
            </Card.Body>
          </Card>

          <Card className={styles.hotspotsCard}>
            <Card.Header title="Active Incidents" />
            <Card.Body className={styles.hotspotsBody}>
              {infectedFarms.length === 0 ? (
                <p className={styles.noIncidents}>No active incidents mapped.</p>
              ) : (
                <ul className={styles.incidentList}>
                  {infectedFarms.map(f => (
                    <li key={f.farm_id} className={styles.incidentItem}>
                      <Activity size={14} color="var(--color-danger)" />
                      <div>
                        <strong>{f.farm_name}</strong>
                        <p>{f.latest_disease} ({f.barangay_name})</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
}
