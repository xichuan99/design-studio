import type { Meta, StoryObj } from '@storybook/react';
import { ImageDropzone } from './ImageDropzone';

const meta = {
  title: 'Tools/ImageDropzone',
  component: ImageDropzone,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '400px', padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ImageDropzone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onFileSelect: (file) => console.log('Image dropped:', file),
  },
};

export const WithInitialImage: Story = {
  args: {
    onFileSelect: (file) => console.log('Image dropped:', file),
  },
};
