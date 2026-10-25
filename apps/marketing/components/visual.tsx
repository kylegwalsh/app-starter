import { AspectRatio, cn } from '@repo/design';
import { ImageIcon } from 'lucide-react';
import Image from 'next/image';

type Props = {
  /** The image source (e.g. `/visuals/dashboard.webp` in `public/`). When omitted, a placeholder is shown */
  src?: string;
  /** Alt text for the image */
  alt?: string;
  /** A short caption shown on the placeholder to hint at the intended image */
  label?: string;
  /** Aspect ratio of the frame (width / height) */
  ratio?: number;
  /** Render a soft brand glow behind the frame */
  glow?: boolean;
  className?: string;
};

/**
 * A product visual framed like a browser window. Renders an intentional placeholder until a
 * real `src` is provided, so the page reads as finished before the screenshots land.
 */
export const Visual = ({ src, alt, label, ratio = 16 / 9, glow = false, className }: Props) => (
  <div className={cn('relative', className)}>
    {glow && (
      <div aria-hidden className="bg-brand/20 absolute -inset-8 -z-10 rounded-[2rem] blur-3xl" />
    )}

    <div className="border-border/70 bg-card overflow-hidden rounded-xl border shadow-2xl shadow-black/5">
      {/* Faux browser chrome */}
      <div className="border-border/60 bg-muted/50 flex h-9 items-center gap-1.5 border-b px-3.5">
        <span className="size-2.5 rounded-full bg-red-400/70" />
        <span className="size-2.5 rounded-full bg-yellow-400/70" />
        <span className="size-2.5 rounded-full bg-green-400/70" />
      </div>

      <AspectRatio ratio={ratio}>
        {src ? (
          <Image src={src} alt={alt ?? ''} fill sizes="(min-width: 1152px) 1152px, 100vw" />
        ) : (
          <div className="from-background to-muted/60 flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br text-center">
            <div className="bg-brand/10 text-brand flex size-11 items-center justify-center rounded-xl">
              <ImageIcon className="size-5" />
            </div>
            {label && (
              <p className="text-muted-foreground max-w-xs px-6 text-xs font-medium">{label}</p>
            )}
          </div>
        )}
      </AspectRatio>
    </div>
  </div>
);
