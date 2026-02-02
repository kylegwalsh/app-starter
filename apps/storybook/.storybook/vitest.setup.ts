import '@testing-library/jest-dom';

// biome-ignore lint/performance/noNamespaceImport: We need to import all annotations
import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview';
import { setProjectAnnotations } from '@storybook/nextjs-vite';

// biome-ignore lint/performance/noNamespaceImport: We need to import all annotations
import * as previewAnnotations from './preview';

const annotations = setProjectAnnotations([a11yAddonAnnotations, previewAnnotations]);

// Run Storybook's beforeAll hook
beforeAll(annotations.beforeAll);
