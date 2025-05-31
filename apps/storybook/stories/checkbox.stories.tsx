import { Checkbox } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * A control that allows the user to toggle between checked and not checked.
 */
const meta: Meta<typeof Checkbox> = {
  title: 'ui/Checkbox',
  component: Checkbox,
  args: {
    id: 'terms',
    disabled: false,
  },
  render: (args) => (
    <div className="flex space-x-2">
      <Checkbox {...args} />
      <label
        htmlFor={args.id}
        className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
        Accept terms and conditions
      </label>
    </div>
  ),
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the checkbox.
 */
export const Default: Story = {};

/**
 * Use the `disabled` prop to disable the checkbox.
 */
export const Disabled: Story = {
  args: {
    id: 'disabled-terms',
    disabled: true,
  },
};
