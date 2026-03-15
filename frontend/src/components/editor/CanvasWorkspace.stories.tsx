import type { Meta, StoryObj } from '@storybook/react';
import { CanvasWorkspace } from './CanvasWorkspace';
import { useCanvasStore } from '@/store/useCanvasStore';

const meta = {
  title: 'Editor/CanvasWorkspace',
  component: CanvasWorkspace,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      // Mock Zustand store state for this story
      useCanvasStore.setState({
        elements: [
          {
            id: 'mock-1',
            type: 'shape',
            shapeType: 'rect',
            x: 100,
            y: 100,
            width: 200,
            height: 150,
            fill: '#3b82f6',
            rotation: 0,
            visible: true,
            locked: false,
          },
          {
            id: 'mock-2',
            type: 'text',
            text: 'Hello Storybook!',
            fontSize: 24,
            fontFamily: 'Arial',
            fill: '#000000',
            x: 120,
            y: 150,
            rotation: 0,
            visible: true,
            locked: false,
          }
        ],
        selectedElementIds: [],
        backgroundColor: '#f8fafc',
      });
      return (
        <div style={{ width: '100vw', height: '100vh' }}>
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof CanvasWorkspace>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default canvas workspace showing a few basic mock elements
 */
export const Default: Story = {
  args: {},
};
