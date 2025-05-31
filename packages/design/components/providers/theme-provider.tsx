import { ThemeProvider as NextThemesProvider } from 'next-themes';

type Props = Component<typeof NextThemesProvider>;

/** Injects our theme into our NextJS apps */
export const ThemeProvider = ({ children }: Props) => {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme>
      {children}
    </NextThemesProvider>
  );
};
