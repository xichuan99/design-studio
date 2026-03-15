import type { Meta, StoryObj } from '@storybook/react';
import { WhatsAppButton } from './WhatsAppButton';

/**
 * WhatsAppButton is a floating action button for users to contact support directly via WhatsApp.
 */
const meta = {
  title: 'Landing/WhatsAppButton',
  component: WhatsAppButton,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WhatsAppButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
