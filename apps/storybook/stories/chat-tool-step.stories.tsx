import { ToolStep } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * One tool call inside `Steps`. Expanding it shows the tool's output: Markdown for text results,
 * a highlighted JSON block for structured ones.
 */
const meta = {
  title: 'chat/ToolStep',
  component: ToolStep,
  args: {
    name: 'Run code',
    defaultOpen: true,
    failed: false,
    output: '```\n2 ** 100 = 1267650600228229401496703205376\n```',
  },
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof ToolStep>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Tools return Markdown, which renders as-is.
 */
export const MarkdownOutput: Story = {};

/**
 * A structured result renders as highlighted JSON.
 */
export const JsonOutput: Story = {
  args: {
    name: 'List organizations',
    output: {
      organizations: [
        { id: 'org_1', name: 'Acme', members: 12 },
        { id: 'org_2', name: 'Globex', members: 4 },
      ],
    },
  },
};

/**
 * A failed call shows as a static "(failed)" row, since the raw error isn't useful to the user.
 */
export const Failed: Story = {
  args: {
    failed: true,
    output: undefined,
  },
};

/**
 * Collapsed, as it shows once the step has finished.
 */
export const Collapsed: Story = {
  args: {
    defaultOpen: false,
  },
};
