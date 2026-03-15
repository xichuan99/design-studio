import type { Meta, StoryObj } from '@storybook/react';
import { EditorTopBar } from './EditorTopBar';

const meta = {
  title: 'Editor/EditorTopBar',
  component: EditorTopBar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '100px', background: '#f5f5f5' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EditorTopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    projectId: '123',
    saveStatus: 'saved',
    onSave: () => console.log('Save clicked'),
  },
};
