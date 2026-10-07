import type { Preview } from '@storybook/react';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#020617' },
        { name: 'slate', value: '#0f172a' },
        { name: 'light', value: '#f8fafc' },
      ],
    },
    viewport: {
      viewports: {
        desktop: {
          name: 'Desktop Baseline (1440px)',
          styles: { width: '1440px', height: '900px' },
        },
        tablet: {
          name: 'iPad Pro (768px)',
          styles: { width: '768px', height: '1024px' },
        },
        mobile: {
          name: 'iPhone 14 / Mobile (375px)',
          styles: { width: '375px', height: '812px' },
        },
      },
      defaultViewport: 'desktop',
    },
    chromatic: {
      viewports: [375, 768, 1440],
      diffThreshold: 0.15,
      pauseAnimationAtEnd: true,
      delay: 300,
    },
  },
};

export default preview;
