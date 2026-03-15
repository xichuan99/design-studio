import type { Meta, StoryObj } from '@storybook/react';
import { BatchImageDropzone } from './BatchImageDropzone';

const meta = {
  title: 'Tools/BatchImageDropzone',
  component: BatchImageDropzone,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '600px', padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BatchImageDropzone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onFilesSelect: (files) => console.log('Images dropped:', files),
  },
};

export const Loading: Story = {
  args: {
    onFilesSelect: (files) => console.log('Images dropped:', files),
  },
};
