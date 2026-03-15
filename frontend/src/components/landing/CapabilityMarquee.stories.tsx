import type { Meta, StoryObj } from '@storybook/react';
import { CapabilityMarquee } from './CapabilityMarquee';

/**
 * CapabilityMarquee component displays a continuous scrolling list of features or capabilities.
 */
const meta = {
  title: 'Landing/CapabilityMarquee',
  component: CapabilityMarquee,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CapabilityMarquee>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
