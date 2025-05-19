import { Providers } from '@/components/providers';
import '@lib/ui/globals.css';
import Script from 'next/script';
import { config } from '@lib/config';
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        {/* Add third part scripts */}
        {/* Live chat widget */}
        {config.crisp.websiteId && (
          <Script id="chat">
            {`window.$crisp=[];window.CRISP_WEBSITE_ID="${config.crisp.websiteId}";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`}
          </Script>
        )}
      </body>
    </html>
  );
}
