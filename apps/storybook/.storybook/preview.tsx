import '@repo/design/globals.css';

import { ThemeProvider } from '@repo/design';
import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview } from '@storybook/nextjs-vite';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    chromatic: {
      modes: {
        light: {
          theme: 'light',
          className: 'light',
        },
        dark: {
          theme: 'dark',
          className: 'dark',
        },
      },
    },
    // Automatically mark any prop that starts with "on" as an action
    actions: { argTypesRegex: '^on.*' },
    // Show a11y violations in the test UI only
    a11y: {
      test: 'todo',
    },
  },
  // Automatically generate doc page for each story
  tags: ['autodocs'],
  // Add theme provider to each story
  decorators: [
    withThemeByClassName({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
    (Story) => (
      <div className="bg-background">
        <ThemeProvider enableSystem={false}>
          <Story />
        </ThemeProvider>
      </div>
    ),
  ],
};

export default preview;
