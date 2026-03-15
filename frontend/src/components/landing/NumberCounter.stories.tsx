import type { Meta, StoryObj } from '@storybook/react';
import { NumberCounter } from './NumberCounter';

/**
 * NumberCounter component animates a number from 0 to a target value.
 */
const meta = {
  title: 'Landing/NumberCounter',
  component: NumberCounter,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '2rem', fontSize: '2rem', fontWeight: 'bold' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NumberCounter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    end: 1000,
    duration: 2,
    suffix: '+',
  },
};
