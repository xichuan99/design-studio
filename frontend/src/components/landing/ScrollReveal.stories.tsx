import type { Meta, StoryObj } from '@storybook/react';
import { ScrollReveal } from './ScrollReveal';

/**
 * ScrollReveal component reveals children with an animation when scrolled into view.
 */
const meta = {
  title: 'Landing/ScrollReveal',
  component: ScrollReveal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '200vh', paddingTop: '100vh', textAlign: 'center' }}>
        <p className="mb-4 text-muted-foreground">Scroll down to see the reveal animation.</p>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScrollReveal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="p-8 bg-blue-500 text-white rounded-xl shadow-lg text-2xl">
        I am revealed on scroll!
      </div>
    ),
  },
};
