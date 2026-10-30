import { Reasoning, Steps, ToolStep } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

/**
 * Groups the model's reasoning and tool calls before its answer into one "Took N steps" row.
 * Each step inside is collapsible too.
 */
const meta = {
  title: 'chat/Steps',
  component: Steps,
  args: {
    count: 3,
    defaultOpen: false,
  },
  parameters: {
    layout: 'padded',
  },
  render: (args) => (
    <Steps {...args}>
      <Reasoning state="done">
        The user wants the primes below 50, so I'll run a quick sieve rather than list them from
        memory.
      </Reasoning>
      <ToolStep
        name="Run code"
        output={'```\n[2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]\n```'}
      />
      <ToolStep
        name="List organizations"
        output={{ organizations: [{ id: 'org_1', name: 'Acme' }] }}
      />
    </Steps>
  ),
} satisfies Meta<typeof Steps>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Collapsed, as a finished answer shows it. Clicking the row reveals each step.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('Run code')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: /Took 3 steps/ }));
    await expect(await canvas.findByText('Run code')).toBeVisible();
  },
};

/**
 * Open, as it shows while the steps are still running.
 */
export const Open: Story = {
  args: {
    defaultOpen: true,
  },
};

/**
 * A single step reads "Took 1 step".
 */
export const SingleStep: Story = {
  args: {
    count: 1,
    defaultOpen: true,
  },
  render: (args) => (
    <Steps {...args}>
      <ToolStep name="Run code" output="_No output._" />
    </Steps>
  ),
};
