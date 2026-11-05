import { useState } from 'react';
import { Film } from 'lucide-react';
import { imageUrl } from '../utils/movies.js';

export default function MovieImage({ path, alt, size = 'w500', className = '', eager = false }) {
  const [failedPath, setFailedPath] = useState(null);
  const src = imageUrl(path, size);
  if (!src || failedPath === path) {
    return <div className={`image-fallback ${className}`} role="img" aria-label={alt}><Film aria-hidden="true" /><span>Image unavailable</span></div>;
  }
  return <img className={className} src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedPath(path)} />;
}
