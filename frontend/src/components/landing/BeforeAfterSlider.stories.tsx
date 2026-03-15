import type { Meta, StoryObj } from '@storybook/react';
import { BeforeAfterSlider } from './BeforeAfterSlider';

const meta = {
  title: 'Landing/BeforeAfterSlider',
  component: BeforeAfterSlider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '800px', height: '600px', padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BeforeAfterSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    beforeImage: 'https://images.unsplash.com/photo-1579353977828-2a4eab540b9a?q=80&w=1000&auto=format&fit=crop',
    afterImage: 'https://images.unsplash.com/photo-1579353977828-2a4eab540b9a?q=80&w=1000&auto=format&fit=crop&sat=-100',
  },
};
