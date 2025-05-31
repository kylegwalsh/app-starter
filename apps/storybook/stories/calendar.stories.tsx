import { Calendar } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { addDays } from 'date-fns';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { action } from 'storybook/actions';

/**
 * A date field component that allows users to enter and edit date.
 */
const meta = {
  title: 'ui/Calendar',
  component: Calendar,
  tags: ['autodocs'],
  argTypes: {},
  args: {
    mode: 'single',
    selected: new Date(),
    className: 'rounded-md border w-fit',
  },
  parameters: {
    layout: 'centered',
  },
  render: (args) => {
    const [selected, setSelected] = useState(args.selected as Date);

    const handleSelect = (date?: Date | DateRange) => {
      action('onSelect')(date);
      setSelected(date as Date);
    };

    return (
      <Calendar
        {...args}
        selected={selected}
        // @ts-expect-error - The mode influences the allowed type of the handleSelect
        onSelect={handleSelect}
      />
    );
  },
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the calendar.
 */
export const Default: Story = {
  args: {
    selected: new Date(),
  },
};

/**
 * Use the `multiple` mode to select multiple dates.
 */
export const Multiple: Story = {
  args: {
    mode: 'multiple',
    min: 1,
    selected: [new Date(), addDays(new Date(), 2), addDays(new Date(), 8)],
  },
};

/**
 * Use the `range` mode to select a range of dates.
 */
export const Range: Story = {
  args: {
    mode: 'range',
    selected: {
      from: new Date(),
      to: addDays(new Date(), 7),
    },
  },
};

/**
 * Use the `disabled` prop to disable specific dates.
 */
export const Disabled: Story = {
  args: {
    selected: new Date(),
    disabled: [
      addDays(new Date(), 1),
      addDays(new Date(), 2),
      addDays(new Date(), 3),
      addDays(new Date(), 5),
    ],
  },
};

/**
 * Use the `numberOfMonths` prop to display multiple months.
 */
export const MultipleMonths: Story = {
  args: {
    selected: new Date(),
    numberOfMonths: 2,
    showOutsideDays: false,
  },
};
