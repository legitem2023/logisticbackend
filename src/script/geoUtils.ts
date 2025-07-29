// Haversine distance calculator (meters)
export function calculateHaversineDistance([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// MongoDB-compatible geospatial query builder
export function buildGeoQuery(center: [number, number], radiusKm: number) {
  return {
    $geoWithin: {
      $centerSphere: [center, radiusKm / 6378.1] // Convert km to radians
    }
  };
}
