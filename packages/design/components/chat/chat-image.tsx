'use client';

import { ImageLightbox } from '@repo/design/components/image/image-lightbox';
import { cn } from '@repo/design/lib/utils';
import { useState } from 'react';

/** In-message image with skeleton placeholder and click-to-expand lightbox */
export const ChatImage = ({ url, alt }: { url: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <ImageLightbox alt={alt} src={url}>
      <button
        className="focus-visible:ring-ring block cursor-zoom-in overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:outline-none"
        type="button"
      >
        {!loaded && <span className="bg-muted block size-40 animate-pulse rounded-lg" />}
        {/* oxlint-disable-next-line next/no-img-element -- CDN-hosted attachment, not optimizable */}
        <img
          alt={alt}
          className={cn(
            'block max-h-80 max-w-xs rounded-lg object-contain',
            loaded ? 'opacity-100' : 'hidden',
          )}
          onLoad={() => setLoaded(true)}
          src={url}
        />
      </button>
    </ImageLightbox>
  );
};
