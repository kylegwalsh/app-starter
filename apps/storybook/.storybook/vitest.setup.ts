import '@testing-library/jest-dom';

import { setProjectAnnotations } from '@storybook/nextjs-vite';

import * as previewAnnotations from './preview';

const annotations = setProjectAnnotations(previewAnnotations);

// Run Storybook's beforeAll hook
beforeAll(annotations.beforeAll);
