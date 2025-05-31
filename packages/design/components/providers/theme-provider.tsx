import { ThemeProvider as NextThemesProvider } from 'next-themes';

type Props = Component<typeof NextThemesProvider>;

/** Injects our theme into our NextJS apps */
export const ThemeProvider = ({ children, ...props }: Props) => {
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
