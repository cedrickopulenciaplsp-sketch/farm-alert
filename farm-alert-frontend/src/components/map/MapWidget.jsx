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
import { ShieldAlert } from 'lucide-react';

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

function resolveIcon(farm) {
  if (farm.farm_status === 'Temporarily Closed') return closedIcon;
  if (farm.farm_status === 'Quarantine' || farm.latest_report_status === 'Active') return dangerIcon;
  return safeIcon;
}

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
      className={className}
      style={{ height: '100%', width: '100%', ...style }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* ── Buffer Zones (Underneath Markers) ── */}
      {validFarms.map(farm => {
        const isInfected = farm.latest_report_status === 'Active' || farm.farm_status === 'Quarantine';
        if (!isInfected) return null;
        return (
          <React.Fragment key={`buffers-${farm.farm_id}`}>
            {/* 3km Surveillance Zone - Orange */}
            <Circle
              center={[farm.latitude, farm.longitude]}
              radius={3000} // 3km in meters
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
        const isInfected = farm.latest_report_status === 'Active';
        return (
          <Marker
            key={farm.farm_id}
            position={[farm.latitude, farm.longitude]}
            icon={resolveIcon(farm)}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font-body)', minWidth: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <strong style={{ fontSize: 13 }}>{farm.farm_name}</strong>
                  {isInfected && <ShieldAlert size={13} color="var(--color-danger)" />}
                </div>
                <p style={{ fontSize: 12, margin: '2px 0' }}><strong>Owner:</strong> {farm.owner_name}</p>
                <p style={{ fontSize: 12, margin: '2px 0' }}><strong>Barangay:</strong> {farm.barangay_name}</p>
                <p style={{ fontSize: 12, margin: '2px 0' }}><strong>Livestock:</strong> {farm.livestock_type_name}</p>
                <p style={{ fontSize: 12, margin: '2px 0' }}><strong>Status:</strong> {farm.farm_status}</p>
                {isInfected && (
                  <div style={{ marginTop: 6, padding: '4px 8px', background: 'var(--color-danger-light)', borderRadius: 4 }}>
                    <p style={{ fontSize: 12, margin: '2px 0', color: 'var(--color-danger)' }}><strong>Active Incident:</strong> {farm.latest_disease}</p>
                    <p style={{ fontSize: 12, margin: '2px 0', color: 'var(--color-danger)' }}><strong>Severity:</strong> {farm.latest_severity}</p>
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
