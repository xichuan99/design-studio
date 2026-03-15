import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';

import { userEvent, within, expect } from '@storybook/test';

/**
 * Standard text input field.
 */
const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Email address',
    type: 'email',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText('Email address');
    await userEvent.type(input, 'test@example.com');
    await expect(input).toHaveValue('test@example.com');
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
};

export const File: Story = {
  args: {
    type: 'file',
  },
};
