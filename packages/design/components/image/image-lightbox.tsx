'use client';

// oxlint-disable no-namespace-import: Radix primitives ship namespaced; this has no runtime cost
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@repo/design/lib/utils';
import { XIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type ImageLightboxProps = {
  /** URL of the image to display at full size */
  src: string;
  /** Accessible description for the image */
  alt?: string;
  /** The trigger element — typically a thumbnail. Rendered via Radix `asChild`. */
  children: ReactNode;
  /** Optional className merged onto the full-size image */
  imageClassName?: string;
};

/**
 * Click-to-expand image viewer built on Radix Dialog.
 * Semi-opaque backdrop, close button top-right, no open/close animation.
 * Focus trap and Esc-to-close come from Radix.
 */
export const ImageLightbox = ({ src, alt, children, imageClassName }: ImageLightboxProps) => (
  <DialogPrimitive.Root>
    <DialogPrimitive.Trigger asChild>{children}</DialogPrimitive.Trigger>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/75" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className="fixed inset-0 z-50 flex items-center justify-center p-8 outline-none"
      >
        <DialogPrimitive.Title className="sr-only">{alt || 'Image'}</DialogPrimitive.Title>
        {/* oxlint-disable-next-line eslint-plugin-next(no-img-element): lightbox shows CDN-hosted attachments */}
        <img
          alt={alt || 'Image'}
          className={cn('max-h-full max-w-full object-contain', imageClassName)}
          src={src}
        />
        <DialogPrimitive.Close
          aria-label="Close image"
          className="bg-background/90 text-foreground hover:bg-background focus-visible:ring-ring fixed top-4 right-4 flex size-9 items-center justify-center rounded-full shadow-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);
