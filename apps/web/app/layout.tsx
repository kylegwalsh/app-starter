import '@repo/design/globals.css';

import { config } from '@repo/config';
import { Toaster } from '@repo/design';
import { createMetadata } from '@repo/seo';
import Script from 'next/script';

import { ErrorBoundary, Providers } from '@/components';

/** The default metadata for the app */
export const metadata = createMetadata();

/** Our primary layout wrapping the entire app */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-svh flex-col antialiased">
        <ErrorBoundary>
          <Providers>{children}</Providers>
          <Toaster />
          {/* Add third part scripts */}
          {/* Live chat widget */}
          {config.crisp.websiteId && (
            <Script id="chat">
              {`window.$crisp=[];window.CRISP_WEBSITE_ID="${config.crisp.websiteId}";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`}
            </Script>
          )}
        </ErrorBoundary>
      </body>
    </html>
  );
}
