const EARTH_RADIUS_KM = 6371;

export function haversineDistance(loc1, loc2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLng = toRad(loc2.lng - loc1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(loc1.lat)) * Math.cos(toRad(loc2.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export function estimateDuration(km, mode = 'car') {
  const speeds = { car: 40, bus: 25, walking: 4, bicycle: 15, taxi: 35, subway: 35 };
  const speed = speeds[mode] || 30;
  const hours = km / speed;
  const minutes = Math.round(hours * 60);
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}
