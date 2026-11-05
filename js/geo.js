// Geometry for the map. Pure functions; points are {lat, lon}.
export function metres(a, b) {
  const rad = Math.PI / 180;
  const x = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * 6371000;
}

export function limitPoints(points, center, max = 300) {
  if (points.length <= max) return points;
  const c = center || points[0];
  return points.map((p) => [metres(c, p), p]).sort((a, b) => a[0] - b[0]).slice(0, max).map(([, p]) => p);
}

export function bbox(points) {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const p of points) {
    w = Math.min(w, p.lon);
    e = Math.max(e, p.lon);
    s = Math.min(s, p.lat);
    n = Math.max(n, p.lat);
  }
  return { southWest: [w, s], northEast: [e, n] };
}
