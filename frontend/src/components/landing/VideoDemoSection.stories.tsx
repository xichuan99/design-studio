import type { Meta, StoryObj } from '@storybook/react';
import { VideoDemoSection } from './VideoDemoSection';

const meta = {
  title: 'Landing/VideoDemoSection',
  component: VideoDemoSection,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof VideoDemoSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
