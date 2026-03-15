import type { Meta, StoryObj } from '@storybook/react';
import { TestimonialCarousel } from './TestimonialCarousel';

const meta = {
  title: 'Landing/TestimonialCarousel',
  component: TestimonialCarousel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TestimonialCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
