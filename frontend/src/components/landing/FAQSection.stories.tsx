import type { Meta, StoryObj } from '@storybook/react';
import { FAQSection } from './FAQSection';

const meta = {
  title: 'Landing/FAQSection',
  component: FAQSection,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FAQSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
