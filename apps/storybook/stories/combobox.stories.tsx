import type { ComboboxOption } from '@repo/design';
import { Combobox } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

/**
 * A searchable select component that combines a text input with a dropdown list of options.
 * Supports single and multiple selection, custom rendering, and creating new options.
 */
const meta = {
  title: 'inputs/Combobox',
  component: Combobox,
  args: {
    placeholder: 'Select an option...',
    searchPlaceholder: 'Search...',
    emptyMessage: 'No results found.',
    className: 'w-96',
  },
  argTypes: {
    multiple: {
      control: 'boolean',
      description: 'Whether multiple options can be selected',
    },
    options: {
      control: 'object',
      description:
        'List of options to display, either flat array or grouped array',
    },
    value: {
      control: 'text',
      description:
        'Controlled value - the currently selected option value (single) or array of values (multiple)',
    },
    defaultValue: {
      control: 'text',
      description: 'Default value for uncontrolled mode',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text shown when no option is selected',
    },
    searchPlaceholder: {
      control: 'text',
      description: 'Placeholder text for the search input',
    },
    emptyMessage: {
      control: 'text',
      description: 'Message displayed when no options match the search query',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes for the root container',
    },
    triggerClassName: {
      control: 'text',
      description: 'Additional CSS classes for the trigger button',
    },
    popoverContentClassName: {
      control: 'text',
      description: 'Additional CSS classes for the popover content',
    },
    commandClassName: {
      control: 'text',
      description: 'Additional CSS classes for the Command component',
    },
    listClassName: {
      control: 'text',
      description: 'Additional CSS classes for the CommandList',
    },
    inputClassName: {
      control: 'text',
      description: 'Additional CSS classes for the CommandInput',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the combobox is disabled',
    },
    loading: {
      control: 'boolean',
      description:
        'Whether the combobox is in a loading state (disables input and shows loading on trigger)',
    },
    loadingResults: {
      control: 'boolean',
      description:
        'Whether search results are loading (shows loading indicator in results list, allows searching)',
    },
    open: {
      control: 'boolean',
      description: 'Controlled open state - whether the popover is open',
    },
    defaultOpen: {
      control: 'boolean',
      description: 'Default open state for uncontrolled mode',
    },
    allowClear: {
      control: 'boolean',
      description: 'Whether to show a "Clear" option when a selection exists',
    },
    clearLabel: {
      control: 'text',
      description: 'Label text for the clear option',
    },
    allowDeselect: {
      control: 'boolean',
      description: 'Whether clicking a selected option again deselects it',
    },
    multiSortable: {
      control: 'boolean',
      description:
        'Whether badges can be dragged to reorder selections (only used when multiple=true)',
    },
    maxMultiLines: {
      control: 'number',
      description:
        'Maximum number of lines to allow for badges/input wrapping (only used when multiple=true). Defaults to unlimited.',
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end'],
      description: 'Alignment of the popover relative to the trigger',
    },
    side: {
      control: 'select',
      options: ['top', 'right', 'bottom', 'left'],
      description: 'Side of the trigger where the popover appears',
    },
    sideOffset: {
      control: 'number',
      description: 'Offset distance from the trigger',
    },
    hideCreateWhenOptionExists: {
      control: 'boolean',
      description: 'Whether to hide create option when an exact match exists',
    },
    onChange: {
      action: 'changed',
      description:
        'Callback fired when selection changes, receives both value and option object (single) or values array and options array (multiple)',
    },
    onOpenChange: {
      action: 'open changed',
      description: 'Callback fired when open state changes',
    },
    onSearchChange: {
      action: 'search changed',
      description: 'Callback fired when the search query changes',
    },
    onCreateOption: {
      action: 'create option',
      description:
        'Function to create a new option from search query, can be async',
    },
    createOptionLabel: {
      control: false,
      description: 'Custom render function for the create option label',
    },
    renderOption: {
      control: false,
      description: 'Custom render function for each option in the list',
    },
    renderSelectedValue: {
      control: false,
      description:
        'Custom render function for the selected value(s) in the trigger',
    },
    icon: {
      control: false,
      description: 'Custom icon to display on the trigger button',
    },
    commandProps: {
      control: false,
      description: 'Additional props passed to the Command component',
    },
    inputProps: {
      control: false,
      description: 'Additional props passed to the search Input component',
    },
    ref: {
      control: false,
      description: 'Ref forwarded to the search input element',
    },
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Combobox>;

export default meta;

type Story = StoryObj<typeof meta>;

const basicOptions = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'blueberry', label: 'Blueberry' },
  { value: 'grapes', label: 'Grapes' },
  { value: 'orange', label: 'Orange' },
  { value: 'strawberry', label: 'Strawberry' },
];

const groupedOptions = [
  {
    label: 'Fruits',
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
      { value: 'blueberry', label: 'Blueberry' },
      { value: 'grapes', label: 'Grapes' },
      { value: 'orange', label: 'Orange' },
      { value: 'strawberry', label: 'Strawberry' },
    ],
  },
  {
    label: 'Vegetables',
    options: [
      { value: 'broccoli', label: 'Broccoli' },
      { value: 'carrot', label: 'Carrot' },
      { value: 'spinach', label: 'Spinach' },
      { value: 'tomato', label: 'Tomato' },
    ],
  },
  {
    label: 'Proteins',
    options: [
      { value: 'chicken', label: 'Chicken' },
      { value: 'beef', label: 'Beef' },
      { value: 'fish', label: 'Fish' },
      { value: 'tofu', label: 'Tofu' },
    ],
  },
];

/** The default form of the combobox with single selection */
export const Default: Story = {
  args: {
    options: basicOptions,
  },
};

/** Combobox with grouped options for better organization */
export const WithGroups: Story = {
  args: {
    options: groupedOptions,
  },
};

/** Combobox that allows selecting multiple options. Selected options appear as badges */
export const Multiple: Story = {
  args: {
    options: basicOptions,
    multiple: true,
  },
};

/** Multiple select combobox with drag-and-drop reordering enabled */
export const MultipleSortable: Story = {
  args: {
    options: basicOptions,
    multiple: true,
    multiSortable: true,
    defaultValue: ['apple', 'banana', 'orange'],
  },
};

/** Combobox with the ability to create new options from search input */
export const WithCreateOption: Story = {
  args: {
    options: basicOptions,
    onCreateOption: async (searchValue) => {
      // Simulate async creation
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        value: searchValue.toLowerCase().replace(/\s+/g, '-'),
        label: searchValue,
      };
    },
    createOptionLabel: (searchValue) => `Create "${searchValue}"`,
  },
};

/** Combobox in a loading state. The trigger button shows a spinner and is disabled */
export const Loading: Story = {
  args: {
    options: basicOptions,
    loading: true,
  },
};

/** Combobox with loading results. The search input remains enabled and shows a loading indicator in the results list */
export const LoadingResults: Story = {
  render: (args) => {
    const [loadingResults, setLoadingResults] = useState(false);
    const [search, setSearch] = useState('');

    return (
      <Combobox
        {...args}
        loadingResults={loadingResults}
        onSearchChange={(value) => {
          setSearch(value);
          setLoadingResults(true);
          // Simulate async search
          setTimeout(() => {
            setLoadingResults(false);
          }, 3000);
        }}
      />
    );
  },
  args: {
    options: basicOptions,
  },
};

/** Disabled combobox that cannot be interacted with */
export const Disabled: Story = {
  args: {
    options: basicOptions,
    disabled: true,
    defaultValue: 'banana',
  },
};

/** Combobox with options that have descriptions */
export const WithDescriptions: Story = {
  args: {
    options: [
      { value: 'apple', label: 'Apple', description: 'A crisp red fruit' },
      {
        value: 'banana',
        label: 'Banana',
        description: 'A yellow tropical fruit',
      },
      {
        value: 'blueberry',
        label: 'Blueberry',
        description: 'Small blue berries',
      },
      {
        value: 'grapes',
        label: 'Grapes',
        description: 'Bunch of purple fruits',
      },
    ],
  },
};

/** Combobox with disabled options that cannot be selected */
export const WithDisabledOptions: Story = {
  args: {
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana', disabled: true },
      { value: 'blueberry', label: 'Blueberry' },
      { value: 'grapes', label: 'Grapes', disabled: true },
    ],
  },
};

/** Combobox with custom rendering */
export const CustomRender: Story = {
  args: {
    options: basicOptions,
    defaultValue: 'banana',
    renderSelectedValue: (option: ComboboxOption | null) =>
      option ? (
        <span className="font-semibold text-primary">
          {option.label.toUpperCase()}
        </span>
      ) : null,
    renderOption: (option, selected) => (
      <div className="flex items-center gap-2">
        <span>{option.label.toUpperCase()}</span>
        {selected && <span className="text-muted-foreground text-xs">X</span>}
      </div>
    ),
  },
};

/** Controlled combobox example showing how to manage state externally */
export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | null>('banana');
    const { defaultValue, renderSelectedValue, ...restArgs } = args;
    return (
      <div className="space-y-4">
        <Combobox
          {...restArgs}
          multiple={false}
          onChange={(newValue, option) => {
            setValue(newValue);
            console.log('Selected:', newValue, option);
          }}
          value={value}
        />
        <div className="text-muted-foreground text-sm">
          Current value: {value ?? 'None'}
        </div>
      </div>
    );
  },
  args: {
    options: basicOptions,
  },
};
