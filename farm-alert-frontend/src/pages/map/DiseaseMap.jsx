import { useState, useEffect, useCallback } from 'react';
import { getMapFarms } from '../../services/analytics';
import { useRealtime } from '../../hooks/useRealtime';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { ShieldAlert, Activity } from 'lucide-react';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Card from '../../components/shared/Card';
import styles from './DiseaseMap.module.css';

// ---------------------------------------------------------------------------
// Fix default Leaflet icons
// ---------------------------------------------------------------------------
delete L.Icon.Default.prototype._getIconUrl;

const safeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const dangerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const quarantineIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

function resolveIcon(farm) {
  if (farm.status === 'Quarantine') return quarantineIcon;
  if (farm.latest_report_status === 'Active') return dangerIcon;
  return safeIcon;
}

// Center of San Pablo City
const MAP_CENTER = [14.0722, 121.3253];

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
  const quarantinedFarms = farms.filter(f => f.status === 'Quarantine');
  const healthyFarms     = farms.filter(f => f.status === 'Active' && f.latest_report_status !== 'Active');

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
          <MapContainer center={MAP_CENTER} zoom={13} className={styles.map}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {farms.map(farm => {
              const isInfected = farm.latest_report_status === 'Active';
              return (
                <Marker
                  key={farm.farm_id}
                  position={[farm.latitude, farm.longitude]}
                  icon={resolveIcon(farm)}
                >
                  <Popup className={styles.popup}>
                    <div className={styles.popupHeader}>
                      <strong>{farm.farm_name}</strong>
                      {isInfected && <ShieldAlert size={14} color="var(--color-danger)" />}
                    </div>
                    <div className={styles.popupBody}>
                      <p><strong>Owner:</strong> {farm.owner_name}</p>
                      <p><strong>Barangay:</strong> {farm.barangay_name}</p>
                      <p><strong>Livestock:</strong> {farm.livestock_type_name}</p>
                      <p><strong>Status:</strong> {farm.status}</p>
                      {isInfected && (
                        <div className={styles.infectedAlert}>
                          <p><strong>Active Incident:</strong> {farm.latest_disease}</p>
                          <p><strong>Severity:</strong> {farm.latest_severity}</p>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className={styles.sidebar}>
          <Card className={styles.legendCard}>
            <Card.Header title="Map Legend" />
            <Card.Body>
              <ul className={styles.legendList}>
                <li className={styles.legendItem}>
                  <img src={safeIcon.options.iconUrl} alt="Green marker" className={styles.legendPin} />
                  <div className={styles.legendText}>
                    <span className={styles.legendLabel}>Healthy / Active</span>
                    <span className={styles.legendDesc}>Farm is operational with no reported disease incidents.</span>
                  </div>
                  <span className={styles.legendCount}>{healthyFarms.length}</span>
                </li>
                <li className={styles.legendItem}>
                  <img src={quarantineIcon.options.iconUrl} alt="Orange marker" className={styles.legendPin} />
                  <div className={styles.legendText}>
                    <span className={styles.legendLabel}>Quarantine</span>
                    <span className={styles.legendDesc}>Farm is under quarantine — movement of animals restricted.</span>
                  </div>
                  <span className={styles.legendCount}>{quarantinedFarms.length}</span>
                </li>
                <li className={styles.legendItem}>
                  <img src={dangerIcon.options.iconUrl} alt="Red marker" className={styles.legendPin} />
                  <div className={styles.legendText}>
                    <span className={styles.legendLabel}>Active Incident</span>
                    <span className={styles.legendDesc}>Farm has an active disease report currently under investigation.</span>
                  </div>
                  <span className={styles.legendCount}>{infectedFarms.length}</span>
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
