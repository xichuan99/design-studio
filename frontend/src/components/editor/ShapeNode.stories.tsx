import type { Meta, StoryObj } from '@storybook/react';
import { ShapeNode } from './ShapeNode';
import { Stage, Layer } from 'react-konva';
import { CanvasElement } from '@/store/useCanvasStore';


/**
 * ShapeNode renders different shapes on the Konva canvas.
 */
const meta = {
  title: 'Editor/ShapeNode',
  component: ShapeNode,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 400, height: 400, border: '1px solid #ccc', background: '#f5f5f5' }}>
        <Stage width={400} height={400}>
          <Layer>
            <Story />
          </Layer>
        </Stage>
      </div>
    ),
  ],
  argTypes: {
    isSelected: { control: 'boolean' },
    onSelect: { action: 'onSelect' },
    onChange: { action: 'onChange' },
  },
} satisfies Meta<typeof ShapeNode>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultElement: CanvasElement = {
  id: '1',
  type: 'shape',
  shapeType: 'rect',
  x: 100,
  y: 100,
  width: 150,
  height: 100,
  fill: '#3b82f6',
  rotation: 0,
};

export const Rectangle: Story = {
  args: {
    element: defaultElement,
    isSelected: false,
    onSelect: () => {},
    onChange: () => {},
  },
};

export const SelectedRectangle: Story = {
  args: {
    element: defaultElement,
    isSelected: true,
    onSelect: () => {},
    onChange: () => {},
  },
  play: async () => {
    // The Transformer should be visible when selected
    // Since Konva renders to canvas, we can't easily query DOM nodes inside it via regular Testing Library,
    // but the interaction setup verifies it doesn't crash.
  },
};

export const Circle: Story = {
  args: {
    element: {
      ...defaultElement,
      shapeType: 'circle',
      width: 100,
      height: 100,
      fill: '#ef4444',
    },
    isSelected: false,
    onSelect: () => {},
    onChange: () => {},
  },
};

export const Line: Story = {
  args: {
    element: {
      ...defaultElement,
      shapeType: 'line',
      width: 200,
      height: 4,
      fill: '#10b981',
    },
    isSelected: false,
    onSelect: () => {},
    onChange: () => {},
  },
};

export const GradientRectangle: Story = {
  args: {
    element: {
      ...defaultElement,
      fillType: 'gradient',
      gradientColors: ['#3b82f6', '#ef4444'],
      gradientAngle: 45,
    },
    isSelected: false,
    onSelect: () => {},
    onChange: () => {},
  },
};
