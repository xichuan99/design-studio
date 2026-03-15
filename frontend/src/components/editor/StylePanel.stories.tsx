import type { Meta, StoryObj } from '@storybook/react';
import { StylePanel } from './StylePanel';

import { within, expect } from '@storybook/test';

/**
 * StylePanel is used to edit properties of the currently selected element or the canvas background.
 */
const meta = {
  title: 'Editor/StylePanel',
  component: StylePanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '300px', height: '600px', border: '1px solid #e5e7eb' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StylePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // When no element is selected, it defaults to showing canvas background settings
    await expect(canvas.getByText(/Background/i)).toBeInTheDocument();
  },
};
