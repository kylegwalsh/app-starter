import fs from 'node:fs';
import path from 'node:path';

import { config } from '@repo/config';
import { readThemeColor } from '@repo/design/lib/theme';
import { ImageResponse } from 'next/og';

// Generate at build time (required for static export), exported as `out/og.png`
export const dynamic = 'force-static';

/** The image colors (the site's brand from globals.css, plus neutrals) */
const colors = {
  // The build runs from apps/marketing
  brand: readThemeColor({
    css: fs.readFileSync(path.resolve('app/globals.css'), 'utf8'),
    variable: '--brand',
  }),
  text: '#0a0a0a',
  muted: '#737373',
  background: '#ffffff',
};

/**
 * The default social sharing image, referenced from the layout's metadata. It's a route
 * (rather than `opengraph-image.tsx`) so the exported file keeps its `.png` extension,
 * which the CDN needs to serve it with the right content type.
 */
export const GET = () => {
  const { name } = config.app;
  const host = config.marketing.url ? new URL(config.marketing.url).host : undefined;

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: 80,
        background: colors.background,
        // A soft wash of the brand color toward the bottom right
        backgroundImage: `linear-gradient(to bottom right, ${colors.background} 45%, ${colors.brand}24 100%)`,
        color: colors.text,
      }}
    >
      {/* The mark: the app's initial on a brand-colored tile */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 88,
          height: 88,
          borderRadius: 22,
          background: colors.brand,
          color: colors.background,
          fontSize: 52,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 112, letterSpacing: '-0.04em', lineHeight: 1 }}>{name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 6, borderRadius: 3, background: colors.brand }} />
          {host && <div style={{ fontSize: 32, color: colors.muted }}>{host}</div>}
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
};
