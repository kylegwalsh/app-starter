import '@testing-library/jest-dom';

import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview';
import { setProjectAnnotations } from '@storybook/nextjs-vite';

import * as previewAnnotations from './preview';

const annotations = setProjectAnnotations([a11yAddonAnnotations, previewAnnotations]);

// Run Storybook's beforeAll hook
beforeAll(annotations.beforeAll);
