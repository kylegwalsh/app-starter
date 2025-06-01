import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-themes',
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
    'storybook-addon-test-codegen',
  ],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      // Filter out props that are not relevant to the component
      propFilter: (prop) => {
        // For props that come from node_modules, we commonly see a lot of repeat props
        // so we'll filter them out here
        if (prop.parent && /node_modules/.test(prop.parent.fileName)) {
          // Filter out aria-* props
          if (prop?.name?.startsWith('aria-')) return false;
          // Filter out data-* attributes
          if (prop?.name?.startsWith('data-')) return false;
          // Filter out props with EventHandler in their type (sometimes used, but exist on most elements)
          if (prop?.type?.name?.includes('EventHandler')) return false;
          // Filter out common React props that aren't useful in Storybook (if they come from a node module)
          const ignoredProps = [
            'key',
            'ref',
            'suppressContentEditableWarning',
            'suppressHydrationWarning',
            'asChild',
            'className',
            'dangerouslySetInnerHTML',
            'defaultChecked',
            'color',
            'defaultValue',
            'accessKey',
            'autoCapitalize',
            'autoFocus',
            'contentEditable',
            'contextMenu',
            'dir',
            'draggable',
            'enterKeyHint',
            'hidden',
            'lang',
            'nonce',
            'slot',
            'spellCheck',
            'style',
            'tabIndex',
            'translate',
            'radioGroup',
            'role',
            'about',
            'content',
            'datatype',
            'inlist',
            'prefix',
            'property',
            'rel',
            'resource',
            'rev',
            'typeof',
            'vocab',
            'autoCorrect',
            'autoSave',
            'itemProp',
            'itemScope',
            'itemType',
            'itemID',
            'itemRef',
            'results',
            'security',
            'unselectable',
            'popover',
            'popoverTargetAction',
            'popoverTarget',
            'inert',
            'inputMode',
            'is',
            'exportparts',
            'part',
            'id',
            'title',
          ];
          if (ignoredProps.includes(prop?.name ?? '')) return false;
        }
        // Filter out "asChild" (it appears even with the above filter)
        if (prop?.name === 'asChild') return false;
        // Otherwise, just return true
        return true;
      },
    },
  },
};
export default config;
