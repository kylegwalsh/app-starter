import { ThemeProvider as NextThemesProvider } from 'next-themes';

/** Injects our theme into our Next.js apps */
export const ThemeProvider: FC<typeof NextThemesProvider> = ({ children, ...props }) => {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
      {...props}>
      {children}
    </NextThemesProvider>
  );
};
