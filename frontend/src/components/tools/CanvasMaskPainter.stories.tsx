import type { Meta, StoryObj } from '@storybook/react';
import { CanvasMaskPainter } from './CanvasMaskPainter';

const meta = {
  title: 'Tools/CanvasMaskPainter',
  component: CanvasMaskPainter,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '800px', height: '600px', border: '1px solid #ccc' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CanvasMaskPainter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    imageUrl: 'https://images.unsplash.com/photo-1579353977828-2a4eab540b9a?q=80&w=1000&auto=format&fit=crop',
    onMaskComplete: (maskBlob) => console.log('Mask saved:', maskBlob),
  },
};

export const WithControls: Story = {
  args: {
    imageUrl: 'https://images.unsplash.com/photo-1579353977828-2a4eab540b9a?q=80&w=1000&auto=format&fit=crop',
    onMaskComplete: (maskBlob) => console.log('Mask saved:', maskBlob),
  },
};
