import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import styles from './LocationPicker.module.css';

// Fix for default Leaflet marker icons not showing up in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Default center to San Pablo City, Laguna if no initial coordinates are provided
const DEFAULT_CENTER = [14.0722, 121.3253]; 
const DEFAULT_ZOOM = 13;

function MapEventHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({ latitude, longitude, onChange, disabled }) {
  const position = latitude && longitude ? [latitude, longitude] : null;

  return (
    <div className={styles.container} aria-disabled={disabled}>
      <MapContainer 
        center={position || DEFAULT_CENTER} 
        zoom={DEFAULT_ZOOM} 
        scrollWheelZoom={true}
        className={styles.map}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {position && <Marker position={position} />}
        {!disabled && <MapEventHandler onLocationSelect={onChange} />}
      </MapContainer>
      <div className={styles.helpText}>
        {disabled 
          ? "Location selection is disabled." 
          : "Click anywhere on the map to drop a pin."}
        {position && !disabled && (
          <span className={styles.coords}>
            Selected: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </span>
        )}
      </div>
    </div>
  );
}
