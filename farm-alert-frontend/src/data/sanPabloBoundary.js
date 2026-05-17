/**
 * Approximate boundary polygon for San Pablo City, Laguna, Philippines.
 * Coordinates are [lat, lng] pairs tracing the city perimeter clockwise.
 *
 * NOTE: These are reasonable approximations derived from the city's known
 * geographic extent (~195 km², center 14.0722°N 121.3253°E).
 * For official/legal use, replace with NAMRIA or PSA boundary data.
 */

// The city boundary polygon [lat, lng]
export const SAN_PABLO_BOUNDARY = [
  [14.1180, 121.2900], // NW
  [14.1280, 121.3050], // N
  [14.1350, 121.3280], // N-center
  [14.1320, 121.3550], // NE
  [14.1180, 121.3800], // NE
  [14.1020, 121.4050], // E
  [14.0800, 121.4200], // E
  [14.0580, 121.4280], // SE
  [14.0350, 121.4180], // SE
  [14.0150, 121.3980], // S
  [13.9980, 121.3720], // S
  [13.9900, 121.3430], // SW
  [13.9910, 121.3120], // SW
  [14.0020, 121.2780], // W
  [14.0280, 121.2580], // W
  [14.0580, 121.2620], // NW
  [14.0880, 121.2720], // NW
  [14.1080, 121.2820], // NW
  [14.1180, 121.2900], // close
];

// Generous bounding box for maxBounds (a bit larger than the city)
export const SAN_PABLO_MAX_BOUNDS = [
  [13.970, 121.240], // SW corner
  [14.155, 121.450], // NE corner
];

// Large world rectangle used for the mask (city polygon becomes the "hole")
export const WORLD_MASK = [
  [-90, -180], [-90, 180], [90, 180], [90, -180],
];
