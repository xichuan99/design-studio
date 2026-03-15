import type { Meta, StoryObj } from '@storybook/react';
import { AIPromptPanel } from './AIPromptPanel';

import { userEvent, within, expect } from '@storybook/test';

/**
 * AIPromptPanel component handles user input for AI generation features.
 */
const meta = {
  title: 'Editor/AIPromptPanel',
  component: AIPromptPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '400px', padding: '20px', border: '1px solid #e5e7eb', background: 'white' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AIPromptPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole('textbox');
    await userEvent.type(textarea, 'Create a blue rectangle');
    await expect(textarea).toHaveValue('Create a blue rectangle');
  },
};
