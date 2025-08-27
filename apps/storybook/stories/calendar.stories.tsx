import { Calendar } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { addDays } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  DateRange,
  type SelectMultipleEventHandler,
  type SelectRangeEventHandler,
  type SelectSingleEventHandler,
} from 'react-day-picker';
import { action } from 'storybook/actions';

/**
 * A date field component that allows users to enter and edit date.
 */
const meta = {
  title: 'ui/Calendar',
  component: Calendar,
  args: {
    mode: 'single',
    selected: new Date(),
    className: 'rounded-md border w-fit',
  },
  parameters: {
    layout: 'centered',
  },
  render: (args) => {
    const mode = args.mode ?? 'single';

    /** The initial selected date for the single mode */
    const initialSingle = (() => {
      if (mode !== 'single') return;
      if ('selected' in args && args.selected instanceof Date) return args.selected;
      return;
    })();
    /** The initial selected dates for the multiple mode */
    const initialMultiple = (() => {
      if (mode !== 'multiple') return;
      if ('selected' in args && Array.isArray(args.selected)) return args.selected;
      return;
    })();
    /** The initial selected range for the range mode */
    const initialRange = (() => {
      if (mode !== 'range') return;
      if (
        'selected' in args &&
        args.selected &&
        typeof args.selected === 'object' &&
        'from' in (args.selected as Record<string, unknown>)
      ) {
        return args.selected as DateRange;
      }
      return;
    })();

    // We need to track the state for each mode since the mode can change on the fly here
    const [selectedSingle, setSelectedSingle] = useState<Date | undefined>(initialSingle);
    const [selectedMultiple, setSelectedMultiple] = useState<Date[] | undefined>(initialMultiple);
    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(initialRange);

    // Listen to mode changes and update the state accordingly
    useEffect(() => {
      switch (mode) {
        case 'single': {
          if ('selected' in args && args.selected instanceof Date) {
            setSelectedSingle(args.selected);
          } else {
            setSelectedSingle(undefined);
          }
          break;
        }
        case 'multiple': {
          if ('selected' in args && Array.isArray(args.selected)) {
            setSelectedMultiple(args.selected);
          } else {
            setSelectedMultiple(undefined);
          }
          break;
        }
        case 'range': {
          if (
            'selected' in args &&
            args.selected &&
            typeof args.selected === 'object' &&
            'from' in (args.selected as Record<string, unknown>)
          ) {
            setSelectedRange(args.selected as DateRange);
          } else {
            setSelectedRange(undefined);
          }
          break;
        }
        default: {
          break;
        }
      }
    }, [mode, args]);

    const handleSelectSingle: SelectSingleEventHandler = (date) => {
      action('onSelect')(date);
      setSelectedSingle(date);
    };

    const handleSelectMultiple: SelectMultipleEventHandler = (dates) => {
      action('onSelect')(dates);
      setSelectedMultiple(dates);
    };

    const handleSelectRange: SelectRangeEventHandler = (range) => {
      action('onSelect')(range);
      setSelectedRange(range);
    };

    // We need to render all versions of the calendar since our mode can change on the fly here
    if (mode === 'multiple') {
      return (
        <Calendar
          {...args}
          mode="multiple"
          selected={selectedMultiple}
          onSelect={handleSelectMultiple}
        />
      );
    }
    if (mode === 'range') {
      return (
        <Calendar {...args} mode="range" selected={selectedRange} onSelect={handleSelectRange} />
      );
    }
    return (
      <Calendar {...args} mode="single" selected={selectedSingle} onSelect={handleSelectSingle} />
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
