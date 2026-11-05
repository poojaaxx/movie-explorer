const imageSizes = new Set([
  'w45',
  'w92',
  'w154',
  'w185',
  'w300',
  'w342',
  'w500',
  'w780',
  'w1280',
  'h632',
  'original',
]);

export function imageUrl(path, size = 'w500') {
  if (typeof path !== 'string' || !/^\/[a-z0-9_-]+\.(jpg|jpeg|png|webp|svg)$/i.test(path))
    return null;
  if (!imageSizes.has(size)) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function formatYear(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 4) : 'TBA';
}

export function formatRating(vote) {
  return Number.isFinite(vote) && vote > 0 && vote <= 10 ? vote.toFixed(1) : 'NR';
}

export function formatRuntime(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'Not available';
  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const remaining = totalMinutes % 60;
  if (!hours) return `${remaining}m`;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}
