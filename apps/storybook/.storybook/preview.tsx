import '@repo/design/globals.css';

import { ThemeProvider } from '@repo/design';
import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

const preview: Preview = {
  // Give every unset "on*" prop a `fn()` spy, which logs to the Actions panel
  argsEnhancers: [
    ({ argTypes, initialArgs }) =>
      Object.fromEntries(
        Object.keys(argTypes)
          .filter((name) => /^on[A-Z]/.test(name) && !(name in initialArgs))
          .map((name) => [name, fn().mockName(name)]),
      ),
  ],
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
