import { describe, expect, it } from 'vitest';
import { formatRating, formatRuntime, formatYear, imageUrl } from './movies.js';

describe('movie presentation helpers', () => {
  it('only builds image URLs from safe TMDB file paths and known sizes', () => {
    expect(imageUrl('/poster_123.jpg')).toBe('https://image.tmdb.org/t/p/w500/poster_123.jpg');
    expect(imageUrl('/backdrop.jpg', 'w1280')).toBe('https://image.tmdb.org/t/p/w1280/backdrop.jpg');
    for (const path of [null, '', 'https://other.example/photo.jpg', '//other.example/photo.jpg', '/../photo.jpg', '/photo.jpg?token=secret']) {
      expect(imageUrl(path)).toBeNull();
    }
    expect(imageUrl('/poster.jpg', '../original')).toBeNull();
  });

  it('formats available metadata and honest fallbacks', () => {
    expect(formatYear('2024-11-01')).toBe('2024');
    expect(formatYear('')).toBe('TBA');
    expect(formatRating(8.173)).toBe('8.2');
    expect(formatRating(0)).toBe('NR');
    expect(formatRuntime(125)).toBe('2h 5m');
    expect(formatRuntime(120)).toBe('2h');
    expect(formatRuntime(45)).toBe('45m');
    expect(formatRuntime(null)).toBe('Not available');
  });
});
