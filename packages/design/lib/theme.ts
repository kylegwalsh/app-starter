import { formatHex, parse } from 'culori';

/** Reads a theme color from the stylesheet as hex, for code that can't use CSS variables */
export const readThemeColor = ({
  css,
  variable,
}: {
  /** The stylesheet's contents */
  css: string;
  /** The CSS variable to read (e.g. `--primary`) */
  variable: `--${string}`;
}) => {
  // Only the light theme (the first `:root` block), not dark mode overrides
  const root = /:root\s*\{([^}]*)\}/.exec(css)?.[1];
  const value = root
    ? new RegExp(String.raw`${variable}\s*:\s*([^;]+);`).exec(root)?.[1]
    : undefined;
  if (!value) {
    throw new Error(`Couldn't find ${variable} in the stylesheet's :root block`);
  }

  const color = parse(value.trim());
  if (!color) {
    throw new Error(`${variable} isn't a color we can read: ${value.trim()}`);
  }
  return formatHex(color);
};
