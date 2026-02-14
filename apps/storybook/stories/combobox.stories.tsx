import type { ComboboxOption } from '@repo/design';
import { Combobox } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

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
      description: 'List of options to display, either flat array or grouped array',
    },
    value: {
      control: 'text',
      description:
        'Controlled value - the currently selected option value (single) or array of values (multiple)',
    },
    defaultValue: {
      control: 'object',
      description:
        'Default value for uncontrolled mode. When multiple is false, use a string (e.g., "apple") or null. When multiple is true, use a string array (e.g., ["apple", "banana"]).',
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
    searchable: {
      control: 'boolean',
      description:
        'Whether the combobox is searchable. When false, hides the search input and shows all options. Defaults to true.',
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
      description: 'Function to create a new option from search query, can be async',
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
      description: 'Custom render function for the selected value(s) in the trigger',
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
  // Verify the multiple select works as expected
  play: async ({ canvasElement }) => {
    const body = canvasElement.ownerDocument.body;
    const canvas = within(body);
    // Click combobox and focus the input
    await userEvent.click(await canvas.findByRole('combobox'));
    // Type 'appl' to search for Apple
    await userEvent.type(
      await canvas.findByPlaceholderText('Select an option...', {
        exact: true,
      }),
      'appl',
    );
    // Verify Apple option is visible
    await waitFor(() => expect(canvas.queryByText('Apple', { exact: true })).toBeVisible());
    // Verify Banana option is not visible
    await waitFor(() =>
      expect(canvas.queryByText('Banana', { exact: true })).not.toBeInTheDocument(),
    );
    // Click Apple option to select it
    await userEvent.click((await canvas.findByText('Apple', { exact: true })) as HTMLElement);
    // Clear the search text
    await userEvent.clear(await canvas.findByRole('textbox'));
    // Wait for Banana option to appear and click it
    await waitFor(() => expect(canvas.queryByText('Banana', { exact: true })).toBeVisible());
    await userEvent.click((await canvas.findByText('Banana', { exact: true })) as HTMLElement);
    // Click outside the combobox to close it
    await userEvent.click(body);
    await new Promise((resolve) => setTimeout(resolve, 250));
    // Verify both Apple and Banana badges are shown
    await waitFor(() => expect(canvas.queryByText('Apple', { exact: true })).toBeVisible());
    await waitFor(() => expect(canvas.queryByText('Banana', { exact: true })).toBeVisible());
    // Click back into combobox and focus the input
    await userEvent.click(await canvas.findByRole('combobox'));
    // Wait for input to be focused
    const textbox = await canvas.findByRole('textbox');
    // Hit backspace twice to remove both badges (Banana first, then Apple)
    await userEvent.type(textbox, '{Backspace}');
    await userEvent.type(textbox, '{Backspace}');
    // Click outside the combobox to close it
    await userEvent.click(body);
    await new Promise((resolve) => setTimeout(resolve, 250));
    // Verify both options are removed (no badges visible) - wait for popover to close
    await waitFor(() =>
      expect(canvas.queryByText('Apple', { exact: true })).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(canvas.queryByText('Banana', { exact: true })).not.toBeInTheDocument(),
    );
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
  // Verify the drag-and-drop reordering works as expected
  play: async ({ canvasElement }) => {
    const body = canvasElement.ownerDocument.body;
    const canvas = within(body);
    // Verify initial order: Apple, Banana, Orange
    const combobox = await canvas.findByRole('combobox');
    // Find badges by their draggable attribute
    const badges = Array.from(combobox.querySelectorAll('[draggable="true"]')) as HTMLElement[];
    expect(badges[0]).toHaveTextContent('Apple');
    expect(badges[1]).toHaveTextContent('Banana');
    expect(badges[2]).toHaveTextContent('Orange');
    // Drag Apple badge to after Orange (should result in: Banana, Orange, Apple)
    const appleBadge = badges[0];
    const orangeBadge = badges[2];
    // Simulate drag using mouse events and drag events
    // First, mouse down on Apple badge
    await userEvent.pointer({
      keys: '[MouseLeft>]',
      target: appleBadge,
    });
    // Start drag
    const dataTransfer = new DataTransfer();
    const dragStartEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });
    appleBadge.dispatchEvent(dragStartEvent);
    // Wait for React to process dragstart
    await new Promise((resolve) => setTimeout(resolve, 50));
    // Move mouse to Orange badge and trigger dragover
    await userEvent.pointer({
      target: orangeBadge,
    });
    const dragOverEvent = new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });
    // Call preventDefault before dispatching
    Object.defineProperty(dragOverEvent, 'preventDefault', {
      value: () => {
        Object.defineProperty(dragOverEvent, 'defaultPrevented', {
          value: true,
          writable: false,
        });
      },
    });
    orangeBadge.dispatchEvent(dragOverEvent);
    // Wait for React to process dragover
    await new Promise((resolve) => setTimeout(resolve, 50));
    // Drop and end drag
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });
    orangeBadge.dispatchEvent(dropEvent);
    const dragEndEvent = new DragEvent('dragend', {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });
    appleBadge.dispatchEvent(dragEndEvent);
    // Release mouse
    await userEvent.pointer({
      keys: '[/MouseLeft]',
    });
    // Wait for reordering to complete
    await waitFor(() => {
      const updatedBadges = Array.from(
        combobox.querySelectorAll('[draggable="true"]'),
      ) as HTMLElement[];
      // Verify new order: Banana, Orange, Apple
      expect(updatedBadges[0]).toHaveTextContent('Banana');
      expect(updatedBadges[1]).toHaveTextContent('Orange');
      expect(updatedBadges[2]).toHaveTextContent('Apple');
    });
  },
};

/** Combobox with the ability to create new options from search input */
export const WithCreateOption: Story = {
  render: (args) => {
    const [options, setOptions] = useState(basicOptions);
    return (
      <Combobox
        {...args}
        createOptionLabel={(searchValue) => `Create "${searchValue}"`}
        onCreateOption={(searchValue) => {
          const newOption = {
            value: searchValue.toLowerCase().replaceAll(' ', '-'),
            label: searchValue,
          };
          // Add the new option to the options list
          setOptions((prev) => [...prev, newOption]);
          return newOption;
        }}
        options={options}
      />
    );
  },
  args: {
    options: basicOptions,
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
    const [, setSearch] = useState('');

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

/** Combobox with search disabled. All options are shown without a search input. */
export const NonSearchable: Story = {
  args: {
    options: basicOptions,
    searchable: false,
  },
};

/** Non-searchable combobox with multiple selection enabled. */
export const NonSearchableMultiple: Story = {
  args: {
    options: basicOptions,
    multiple: true,
    searchable: false,
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
        <span className="text-primary font-semibold">{option.label.toUpperCase()}</span>
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
        <div className="text-muted-foreground text-sm">Current value: {value ?? 'None'}</div>
      </div>
    );
  },
  args: {
    options: basicOptions,
  },
};
