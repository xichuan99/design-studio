import type { Meta, StoryObj } from '@storybook/react';
import { ResultGallery } from './ResultGallery';

const meta = {
  title: 'Landing/ResultGallery',
  component: ResultGallery,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ResultGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
