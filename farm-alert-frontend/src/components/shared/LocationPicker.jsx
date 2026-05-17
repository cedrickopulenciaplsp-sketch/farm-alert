import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import styles from './LocationPicker.module.css';

// Fix Leaflet default marker icon in React/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Default center: San Pablo City, Laguna
const DEFAULT_CENTER = [14.0722, 121.3253];
const DEFAULT_ZOOM   = 13;

// ---------------------------------------------------------------------------
// MapEventHandler — clicking the map calls onLocationSelect
// ---------------------------------------------------------------------------
function MapEventHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) { onLocationSelect(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

// ---------------------------------------------------------------------------
// MapFlyTo — flies to new coordinates when they change externally
// ---------------------------------------------------------------------------
function MapFlyTo({ position }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!position) return;
    const key = position.join(',');
    if (prev.current === key) return;
    prev.current = key;
    map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [position, map]);
  return null;
}

// ---------------------------------------------------------------------------
// LocationPicker
// Props:
//   latitude, longitude  — controlled values (number | null)
//   onChange(lat, lng)   — called whenever position changes
//   disabled             — read-only mode
// ---------------------------------------------------------------------------
export default function LocationPicker({ latitude, longitude, onChange, disabled }) {
  const position = latitude != null && longitude != null ? [latitude, longitude] : null;

  // Local text inputs — kept in sync with props
  const [latText, setLatText] = useState(latitude != null ? String(latitude) : '');
  const [lngText, setLngText] = useState(longitude != null ? String(longitude) : '');

  // Sync text fields when parent updates (e.g. click on map or edit load)
  useEffect(() => {
    setLatText(latitude != null ? String(latitude) : '');
  }, [latitude]);
  useEffect(() => {
    setLngText(longitude != null ? String(longitude) : '');
  }, [longitude]);

  // When user finishes typing a coordinate, validate and propagate
  function commitCoords(newLatText, newLngText) {
    const lat = parseFloat(newLatText);
    const lng = parseFloat(newLngText);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      onChange(lat, lng);
    }
  }

  function handleLatChange(e) {
    setLatText(e.target.value);
  }
  function handleLatBlur() {
    commitCoords(latText, lngText);
  }

  function handleLngChange(e) {
    setLngText(e.target.value);
  }
  function handleLngBlur() {
    commitCoords(latText, lngText);
  }

  function handleMapClick(lat, lng) {
    onChange(lat, lng); // parent updates latitude/longitude props → useEffect syncs text
  }

  function handleClear() {
    setLatText('');
    setLngText('');
    onChange(null, null);
  }

  return (
    <div className={styles.container} aria-disabled={disabled}>

      {/* ── Coordinate input row ──────────────────────────────────────────── */}
      {!disabled && (
        <div className={styles.coordInputRow}>
          <div className={styles.coordField}>
            <label htmlFor="coord-lat" className={styles.coordLabel}>Latitude</label>
            <input
              id="coord-lat"
              type="number"
              step="any"
              className={styles.coordInput}
              placeholder="e.g. 14.0722"
              value={latText}
              onChange={handleLatChange}
              onBlur={handleLatBlur}
              min={-90}
              max={90}
              aria-label="Latitude"
            />
          </div>
          <div className={styles.coordField}>
            <label htmlFor="coord-lng" className={styles.coordLabel}>Longitude</label>
            <input
              id="coord-lng"
              type="number"
              step="any"
              className={styles.coordInput}
              placeholder="e.g. 121.3253"
              value={lngText}
              onChange={handleLngChange}
              onBlur={handleLngBlur}
              min={-180}
              max={180}
              aria-label="Longitude"
            />
          </div>
          {position && (
            <button
              type="button"
              className={styles.clearCoordsBtn}
              onClick={handleClear}
              title="Clear pin"
              aria-label="Clear coordinates"
            >
              ✕ Clear pin
            </button>
          )}
        </div>
      )}

      {/* ── Map ──────────────────────────────────────────────────────────── */}
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
        {position && <MapFlyTo position={position} />}
        {!disabled && <MapEventHandler onLocationSelect={handleMapClick} />}
      </MapContainer>

      {/* ── Help text ────────────────────────────────────────────────────── */}
      <div className={styles.helpText}>
        {disabled
          ? 'Location is read-only.'
          : position
            ? <>
                <span className={styles.pinned}>📍 Pinned at:</span>
                <span className={styles.coords}>
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </span>
                <span className={styles.hint}> — type new coordinates above or click the map to move the pin.</span>
              </>
            : 'Type coordinates above or click anywhere on the map to drop a pin.'
        }
      </div>
    </div>
  );
}
