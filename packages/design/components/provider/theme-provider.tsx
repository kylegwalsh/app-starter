import { ThemeProvider as NextThemesProvider } from 'next-themes';

/** Injects our theme into our Next.js apps */
export const ThemeProvider: FC<typeof NextThemesProvider> = ({ children, ...props }) => (
  <NextThemesProvider
    attribute="class"
    defaultTheme="light"
    disableTransitionOnChange
    enableColorScheme
    {...props}
  >
    {children}
  </NextThemesProvider>
);
