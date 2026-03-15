import type { Meta, StoryObj } from '@storybook/react';
import { FloatingToolbar } from './FloatingToolbar';
import { useCanvasStore } from '@/store/useCanvasStore';

const meta = {
  title: 'Editor/FloatingToolbar',
  component: FloatingToolbar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '50px', background: '#f5f5f5' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FloatingToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    top: 50,
    left: 150,
    elementId: 'mock-1',
  },
  decorators: [
    (Story) => {
      useCanvasStore.setState({
        elements: [
          { id: 'mock-1', type: 'shape', shapeType: 'rect', x: 0, y: 0, rotation: 0, locked: false }
        ],
      });
      return <Story />;
    },
  ],
};
