import { Toaster } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { toast } from 'sonner';
import { action } from 'storybook/actions';

/**
 * An opinionated toast component for React.
 */
const meta: Meta<typeof Toaster> = {
  title: 'ui/Toaster',
  component: Toaster,
  args: {
    position: 'bottom-right',
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Toaster>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the toaster.
 */
export const Default: Story = {
  render: (args) => (
    <div className="flex min-h-96 items-center justify-center space-x-2">
      <button
        onClick={() =>
          toast('Event has been created', {
            description: new Date().toLocaleString(),
            action: {
              label: 'Undo',
              onClick: action('Undo clicked'),
            },
          })
        }
        type="button"
      >
        Show Toast
      </button>
      <Toaster {...args} />
    </div>
  ),
};
