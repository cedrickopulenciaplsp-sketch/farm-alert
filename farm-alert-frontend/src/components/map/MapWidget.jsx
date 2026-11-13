/**
 * MapWidget.jsx
 * A reusable Leaflet map component that renders farm markers on a map.
 * Accepts `farms` as a prop so it can be used inside the Dashboard
 * without needing to fetch data itself.
 *
 * The standalone DiseaseMap page continues to own its own data fetching
 * and realtime subscriptions, then passes the result to this widget.
 */
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import React from 'react';
import L from 'leaflet';
import { ShieldWarning as ShieldAlert } from '@phosphor-icons/react';

// ── Fix default Leaflet icons (must run once, module-level) ──────────────────
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

const closedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

/**
 * A farm has an active incident only when there is an open (non-Resolved)
 * outbreak alert for it that has not been cleared by a Negative RADDL result.
 */
export function hasActiveIncident(farm) {
  if (farm.lab_result === 'Negative') return false;
  if (!farm.outbreak_status || farm.outbreak_status === 'Resolved') return false;
  return true;
}

/**
 * 1 km Infected Zone and 7 km Surveillance Zone rings are drawn ONLY for
 * confirmed outbreaks (Positive RADDL result) or active quarantine checkpoints.
 */
export function hasQuarantineZones(farm) {
  if (!hasActiveIncident(farm)) return false;
  return farm.lab_result === 'Positive' || farm.checkpoint_issued === true;
}

function resolveIcon(farm) {
  if (farm.farm_status === 'Temporarily Closed') return closedIcon;
  if (hasActiveIncident(farm)) return dangerIcon;
  return safeIcon;
}

import MapLockControl from './MapLockControl';

// Center of San Pablo City
const MAP_CENTER = [14.0722, 121.3253];

/**
 * @param {object}   props
 * @param {Array}    props.farms     – Array of farm objects from v_map_farms view.
 *                                    Only farms with latitude & longitude are rendered.
 * @param {number}   props.zoom      – Initial zoom level (default 13).
 * @param {string}   props.className – Optional CSS class for the MapContainer element.
 * @param {string}   props.style     – Optional inline style object for the MapContainer.
 */
export default function MapWidget({ farms = [], zoom = 13, className = '', style = {} }) {
  const validFarms = farms.filter(f => f.latitude && f.longitude);

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={zoom}
      scrollWheelZoom={false} // Initially false, managed by MapLockControl
      className={className}
      style={{ height: '100%', width: '100%', ...style }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Lock Toggle for Scroll Zoom */}
      <MapLockControl />

      {/* ── Buffer Zones (Underneath Markers) ── */}
      {validFarms.map(farm => {
        if (!hasQuarantineZones(farm)) return null;
        return (
          <React.Fragment key={`buffers-${farm.farm_id}`}>
            {/* 7km Surveillance Zone - Orange */}
            <Circle
              center={[farm.latitude, farm.longitude]}
              radius={7000} // 7km in meters
              pathOptions={{
                color: '#f59e0b',
                fillColor: '#f59e0b',
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: '5, 5'
              }}
            />
            {/* 1km Infected Zone - Red */}
            <Circle
              center={[farm.latitude, farm.longitude]}
              radius={1000} // 1km in meters
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.25,
                weight: 2
              }}
            />
          </React.Fragment>
        );
      })}

      {farms.filter(f => f.latitude && f.longitude).map(farm => {
        const hasIncident = hasActiveIncident(farm);
        return (
          <Marker
            key={farm.farm_id}
            position={[farm.latitude, farm.longitude]}
            icon={resolveIcon(farm)}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font-body)', minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <strong style={{ fontSize: 13 }}>{farm.farm_name}</strong>
                  {hasIncident && <ShieldAlert size={13} color="var(--color-danger)" />}
                </div>
                <p style={{ fontSize: 12, margin: '2px 0' }}><strong>Owner:</strong> {farm.owner_name}</p>
                <p style={{ fontSize: 12, margin: '2px 0' }}><strong>Barangay:</strong> {farm.barangay_name}</p>
                <p style={{ fontSize: 12, margin: '2px 0' }}><strong>Livestock:</strong> {farm.livestock_type_name}</p>
                <p style={{ fontSize: 12, margin: '2px 0' }}>
                  <strong>Status:</strong>{' '}
                  {hasIncident
                    ? (farm.lab_result === 'Positive'
                        ? 'Confirmed Outbreak (1km/7km Quarantine)'
                        : farm.outbreak_status === 'Acknowledged'
                        ? 'Under Investigation (Samples Collected)'
                        : 'Suspected Incident (Awaiting Dispatch)')
                    : (farm.farm_status === 'Temporarily Closed'
                        ? 'Temporarily Closed'
                        : farm.lab_result === 'Negative'
                        ? 'Healthy (Lab Cleared)'
                        : 'Healthy / Active')}
                </p>
                {hasIncident && (
                  <div style={{ marginTop: 6, padding: '6px 8px', background: 'var(--color-danger-light)', borderRadius: 4 }}>
                    <p style={{ fontSize: 12, margin: '2px 0', color: 'var(--color-danger)' }}>
                      <strong>Active Incident:</strong> {farm.latest_disease || 'Suspected Incident'}
                    </p>
                    <p style={{ fontSize: 11, margin: '2px 0', color: 'var(--color-danger)' }}>
                      <strong>Lab Result:</strong> {farm.lab_result ? `${farm.lab_result} (RADDL)` : 'Pending Lab Confirmation'}
                    </p>
                    {farm.checkpoint_issued && (
                      <p style={{ fontSize: 11, margin: '2px 0', fontWeight: 700, color: 'var(--color-danger)' }}>
                        Quarantine Checkpoint Active
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
