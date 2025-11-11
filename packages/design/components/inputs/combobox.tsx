'use client';

import { Badge } from '@repo/design/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@repo/design/components/ui/command';
import { Input } from '@repo/design/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/design/components/ui/popover';
import { cn } from '@repo/design/lib/utils';
import { CheckIcon, ChevronsUpDownIcon, Loader2 } from 'lucide-react';
import {
  type ComponentProps,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type ComboboxOption = {
  /** Value of the option */
  value: string;
  /** Label of the option */
  label: string;
  /** Description of the option */
  description?: string;
  /** Additional keywords that should be matched during filtering */
  keywords?: string[];
  /** Disable selection for this option */
  disabled?: boolean;
  /** Optional icon to render alongside the option label */
  icon?: ComponentProps<'div'>['children'];
  /** Optional badge to render next to the option label */
  badge?: ComponentProps<'div'>['children'];
};

type ComboboxOptionGroup = {
  /** Label of the group */
  label?: string;
  /** Options in the group */
  options: ComboboxOption[];
};

type ComboboxPropsBase = {
  /** List of options to display, either flat array or grouped array */
  options: ComboboxOption[] | ComboboxOptionGroup[];
  /** Whether badges can be dragged to reorder selections (only used when multiple=true) */
  multiSortable?: boolean;
  /** Maximum number of lines to allow for badges/input wrapping (only used when multiple=true). Defaults to unlimited. */
  maxMultiLines?: number;
  /** Placeholder text shown when no option is selected */
  placeholder?: string;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Message displayed when no options match the search query */
  emptyMessage?: ComponentProps<'div'>['children'];
  /** Additional CSS classes for the root container */
  className?: string;
  /** Additional CSS classes for the trigger button */
  triggerClassName?: string;
  /** Additional CSS classes for the popover content */
  popoverContentClassName?: string;
  /** Additional CSS classes for the Command component */
  commandClassName?: string;
  /** Additional CSS classes for the CommandList */
  listClassName?: string;
  /** Additional CSS classes for the CommandInput */
  inputClassName?: string;
  /** Whether to show a "Clear" option when a selection exists */
  allowClear?: boolean;
  /** Label text for the clear option */
  clearLabel?: string;
  /** Whether clicking a selected option again deselects it */
  allowDeselect?: boolean;
  /** Whether the combobox is disabled */
  disabled?: boolean;
  /** Whether the combobox is in a loading state (disables input and shows loading on trigger) */
  loading?: boolean;
  /** Whether search results are loading (shows loading indicator in results list, allows searching) */
  loadingResults?: boolean;
  /** Controlled open state - whether the popover is open */
  open?: boolean;
  /** Default open state for uncontrolled mode */
  defaultOpen?: boolean;
  /** Callback fired when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Callback fired when the search query changes */
  onSearchChange?: (search: string) => void;
  /** Alignment of the popover relative to the trigger */
  align?: ComponentProps<typeof PopoverContent>['align'];
  /** Side of the trigger where the popover appears */
  side?: ComponentProps<typeof PopoverContent>['side'];
  /** Offset distance from the trigger */
  sideOffset?: number;
  /** Function to create a new option from search query, can be async */
  onCreateOption?: (
    searchValue: string
  ) => undefined | ComboboxOption | Promise<undefined | ComboboxOption>;
  /** Custom render function for the create option label */
  createOptionLabel?: (
    searchValue: string
  ) => ComponentProps<'div'>['children'];
  /** Whether to hide create option when an exact match exists */
  hideCreateWhenOptionExists?: boolean;
  /** Custom render function for each option in the list */
  renderOption?: (
    option: ComboboxOption,
    selected: boolean
  ) => ComponentProps<'div'>['children'];
  /** Custom icon to display on the trigger button */
  icon?: ComponentProps<'div'>['children'];
  /** Additional props passed to the Command component */
  commandProps?: Omit<ComponentProps<typeof Command>, 'children'>;
  /** Additional props passed to the search Input component */
  inputProps?: Omit<
    ComponentProps<typeof Input>,
    'value' | 'onChange' | 'placeholder'
  >;
  /** Ref forwarded to the search input element */
  ref?: Ref<HTMLInputElement>;
};

type ComboboxProps =
  | (ComboboxPropsBase & {
      /** Whether multiple options can be selected */
      multiple?: false;
      /** Controlled value - the currently selected option value */
      value?: string | null;
      /** Default value for uncontrolled mode */
      defaultValue?: string | null;
      /** Callback fired when selection changes, receives both value and option object */
      onChange?: (value: string | null, option: ComboboxOption | null) => void;
      /** Custom render function for the selected value in the trigger */
      renderSelectedValue?: (
        option: ComboboxOption | null
      ) => ComponentProps<'div'>['children'];
    })
  | (ComboboxPropsBase & {
      /** Whether multiple options can be selected */
      multiple: true;
      /** Controlled value - array of selected option values */
      value?: string[];
      /** Default value for uncontrolled mode */
      defaultValue?: string[];
      /** Callback fired when selection changes, receives both values array and options array */
      onChange?: (values: string[], options: ComboboxOption[]) => void;
      /** Custom render function for the selected values in the trigger */
      renderSelectedValue?: (
        options: ComboboxOption[]
      ) => ComponentProps<'div'>['children'];
    });

/** Special value used to identify the "clear" option in the command list. Allows us to distinguish between clearing the selection and selecting an actual option. */
const CLEAR_OPTION_VALUE = '__combobox-clear__';

/** Type guard to check if options are grouped or flat. Returns true if the first element has an 'options' property (indicating groups). */
const isOptionGroupArray = (
  options: ComboboxOption[] | ComboboxOptionGroup[]
): options is ComboboxOptionGroup[] =>
  options.length > 0 && 'options' in options[0];

export type { ComboboxOption, ComboboxOptionGroup, ComboboxProps };

/**
 * A searchable combobox component that allows users to select from a list of options
 * or create new options dynamically. Supports both controlled and uncontrolled modes,
 * grouped options, custom rendering, and keyboard navigation.
 */
export const Combobox = ({
  options,
  multiple = false,
  value: controlledValue,
  defaultValue,
  onChange,
  multiSortable = false,
  maxMultiLines,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No results found.',
  className,
  triggerClassName,
  popoverContentClassName,
  commandClassName,
  listClassName,
  inputClassName,
  allowClear = false,
  clearLabel = 'Clear selection',
  allowDeselect = true,
  disabled = false,
  loading = false,
  loadingResults = false,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  onSearchChange,
  align,
  side,
  sideOffset,
  onCreateOption,
  createOptionLabel,
  hideCreateWhenOptionExists = true,
  renderOption,
  renderSelectedValue,
  icon,
  commandProps,
  inputProps,
  ref,
}: ComboboxProps) => {
  // Normalize options into groups format for consistent processing
  const groups = useMemo<ComboboxOptionGroup[]>(() => {
    if (isOptionGroupArray(options)) {
      return options;
    }
    return [{ options }];
  }, [options]);

  // Flatten all groups into a single array for easier searching and value lookup
  const flattenedOptions = useMemo(
    () => groups.flatMap((group) => group.options),
    [groups]
  );

  /** Whether value is controlled (via props) or uncontrolled (internal state) */
  const isValueControlled = controlledValue !== undefined;

  // Internal state for single and multi combobox
  const [uncontrolledValueSingle, setUncontrolledValueSingle] = useState<
    string | null
  >(multiple ? null : ((defaultValue as string | null | undefined) ?? null));
  const [uncontrolledValueMultiple, setUncontrolledValueMultiple] = useState<
    string[]
  >(multiple ? ((defaultValue as string[] | undefined) ?? []) : []);

  /** Current selected value(s), either from props (controlled) or internal state (uncontrolled) */
  const selectedValue = useMemo(() => {
    if (multiple) {
      if (isValueControlled) {
        return (controlledValue as string[] | undefined) ?? [];
      }
      return uncontrolledValueMultiple;
    }
    if (isValueControlled) {
      return (controlledValue as string | null | undefined) ?? null;
    }
    return uncontrolledValueSingle;
  }, [
    multiple,
    isValueControlled,
    controlledValue,
    uncontrolledValueMultiple,
    uncontrolledValueSingle,
  ]);

  /** Finds an option by its value string. Returns null if no option matches or if value is null/undefined. */
  const getOptionByValue = useCallback(
    (optionValue: string | null) => {
      if (!optionValue) {
        return null;
      }
      return (
        flattenedOptions.find((option) => option.value === optionValue) ?? null
      );
    },
    [flattenedOptions]
  );

  /** Helper to get options by values array */
  const getOptionsByValues = useCallback(
    (values: string[]) =>
      values
        .map((val) => flattenedOptions.find((opt) => opt.value === val))
        .filter((opt): opt is ComboboxOption => opt !== undefined),
    [flattenedOptions]
  );

  /** The currently selected option (single mode), derived from selectedValue */
  const selectedOption = useMemo(() => {
    if (multiple) {
      return null;
    }
    return getOptionByValue(selectedValue as string | null);
  }, [multiple, getOptionByValue, selectedValue]);

  /** The currently selected options (multiple mode), derived from selectedValue */
  const selectedOptions = useMemo(() => {
    if (!multiple) {
      return [];
    }
    return getOptionsByValues(selectedValue as string[]);
  }, [multiple, getOptionsByValues, selectedValue]);

  // Determine if open state is controlled (via props) or uncontrolled (internal state)
  const isOpenControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  /** Current open state, either from props (controlled) or internal state (uncontrolled) */
  const open = isOpenControlled ? Boolean(controlledOpen) : uncontrolledOpen;
  /** Track if we're in the middle of a selection to prevent popover from closing */
  const isSelectingRef = useRef(false);

  /** Handles opening and closing the popover. Updates internal state (uncontrolled) or calls onOpenChange prop (controlled). */
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      // Prevent closing if we're selecting an item
      if (!nextOpen && isSelectingRef.current) {
        isSelectingRef.current = false;
        return;
      }
      if (!isOpenControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isOpenControlled, onOpenChange]
  );

  // Current search query entered
  const [search, setSearch] = useState('');

  /** Handles search query changes, updating internal state and calling onSearchChange callback */
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      onSearchChange?.(value);
    },
    [onSearchChange]
  );

  // Handle the open and close state of the popover
  useEffect(() => {
    // When open, focus the input and measure the trigger width
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0); // Focus the input after a small delay to ensure the popover is fully open
      if (triggerContainerRef.current) {
        setTriggerWidth(triggerContainerRef.current.offsetWidth);
      } // Measure the trigger width to match the popover width
    }
    // When closing, clear the search state
    else {
      setSearch('');
      onSearchChange?.('');
    }
  }, [open, onSearchChange]);

  /** Updates selected value(s) - handles controlled/uncontrolled modes and single/multiple types */
  const setValue = useCallback(
    (
      nextValue: string | null | string[],
      option: ComboboxOption | null | ComboboxOption[]
    ) => {
      if (multiple) {
        const values = (nextValue as string[]) ?? [];
        const options = (option as ComboboxOption[]) ?? [];
        if (!isValueControlled) {
          setUncontrolledValueMultiple(values);
        }
        (onChange as (values: string[], options: ComboboxOption[]) => void)?.(
          values,
          options
        );
      } else {
        const value = (nextValue as string | null) ?? null;
        const opt = (option as ComboboxOption | null) ?? null;
        if (!isValueControlled) {
          setUncontrolledValueSingle(value);
        }
        (
          onChange as (
            value: string | null,
            option: ComboboxOption | null
          ) => void
        )?.(value, opt);
      }
    },
    [isValueControlled, onChange, multiple]
  );

  /** Closes the popover and clears the search query. Called after selection or when user cancels. */
  const closePopover = useCallback(() => {
    handleOpenChange(false);
    setSearch('');
  }, [handleOpenChange]);

  /** Handles selection of an option from the list. In multiple mode, toggles selection. In single mode, selects or deselects based on allowDeselect. Disabled options are ignored. */
  const handleSelect = useCallback(
    (option: ComboboxOption) => {
      if (option.disabled) {
        return;
      }

      // Logic for handling a selection when using a multi-combobox
      if (multiple) {
        // Mark that we're selecting to prevent popover from closing in multiple mode
        isSelectingRef.current = true;
        const currentValues = selectedValue as string[];
        const isSelected = currentValues.includes(option.value);
        const nextValues = isSelected
          ? currentValues.filter((v) => v !== option.value)
          : [...currentValues, option.value];
        const nextOptions = getOptionsByValues(nextValues);
        setValue(nextValues, nextOptions);
        // Don't close popover in multiple mode - allow multiple selections
        // Refocus input to keep it focused
        setTimeout(() => {
          inputRef.current?.focus();
          isSelectingRef.current = false;
        }, 0);
      }
      // Logic for handling a selection when using a single-combobox
      else {
        let nextValue: string | null = option.value;
        let nextOption: ComboboxOption | null = option;

        // Toggle deselection: if clicking the same option and deselection is allowed
        if (
          allowDeselect &&
          (selectedValue as string | null) === option.value
        ) {
          nextValue = null;
          nextOption = null;
        }

        setValue(nextValue, nextOption);
        // Close popover after selection in single mode
        // Don't set isSelectingRef for single mode - we want it to close
        closePopover();
      }
    },
    [
      allowDeselect,
      selectedValue,
      setValue,
      multiple,
      getOptionsByValues,
      closePopover,
    ]
  );

  /** Handles clearing the current selection via the "Clear" option. Only shown when allowClear is true and a selection exists. */
  const handleClear = useCallback(() => {
    if (multiple) {
      setValue([], []);
    } else {
      setValue(null, null);
    }
    closePopover();
  }, [closePopover, setValue, multiple]);

  /** Drag-and-drop state: draggedIndex (badge being dragged), dropTargetIndex (drop position) */
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const canDrag = multiSortable && multiple;

  /** Initiates drag operation */
  const handleDragStart = useCallback(
    (index: number) => {
      if (!canDrag) {
        return;
      }
      setDraggedIndex(index);
      setDropTargetIndex(null);
    },
    [canDrag]
  );

  /** Tracks drop target during drag (doesn't reorder until drop) */
  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      if (!canDrag || draggedIndex === null) {
        return;
      }
      e.preventDefault();
      // Only track the drop target, don't update order yet
      if (draggedIndex !== index) {
        setDropTargetIndex(index);
      }
    },
    [canDrag, draggedIndex]
  );

  /** Applies reordering when drag ends */
  const handleDragEnd = useCallback(() => {
    if (
      draggedIndex !== null &&
      dropTargetIndex !== null &&
      draggedIndex !== dropTargetIndex
    ) {
      // Apply the reorder only when drag ends
      const newOptions = [...selectedOptions];
      const draggedOption = newOptions[draggedIndex];
      newOptions.splice(draggedIndex, 1);
      newOptions.splice(dropTargetIndex, 0, draggedOption);

      const newValues = newOptions.map((opt) => opt.value);
      setValue(newValues, newOptions);
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  }, [draggedIndex, dropTargetIndex, selectedOptions, setValue]);

  // Normalize search query for matching
  const trimmedSearch = search.trim();
  const lowerSearch = trimmedSearch.toLowerCase();

  /** Checks if the current search query exactly matches any existing option (by value or label). Used to determine if we should show the "create" option. */
  const hasExactMatch = useMemo(() => {
    if (!trimmedSearch) {
      return false;
    }
    return flattenedOptions.some((option) => {
      const byValue = option.value.toLowerCase() === lowerSearch;
      const byLabel = option.label.toLowerCase() === lowerSearch;
      return byValue || byLabel;
    });
  }, [flattenedOptions, lowerSearch, trimmedSearch]);

  /** Determines whether to show the "create new option" item. Shown when onCreateOption is provided, user has entered a search query, and hideCreateWhenOptionExists is false OR no exact match exists. */
  const showCreateOption = Boolean(
    onCreateOption &&
      trimmedSearch &&
      !(hideCreateWhenOptionExists && hasExactMatch)
  );

  /** Handles creation of a new option from the search query. Calls onCreateOption (which may be async), then selects the created option. Closes the popover after creation completes (success or failure). */
  const handleCreate = useCallback(
    (searchValue: string) => {
      if (!onCreateOption) {
        return;
      }

      // Call the onCreateOption function and handle the result
      const result = onCreateOption(searchValue);
      Promise.resolve(result)
        .then((created) => {
          if (!created) {
            return;
          }
          if (multiple) {
            const currentValues = selectedValue as string[];
            const nextValues = [...currentValues, created.value];
            const nextOptions = getOptionsByValues(nextValues);
            setValue(nextValues, nextOptions);
          } else {
            setValue(created.value, created);
          }
        })
        .finally(() => {
          if (!multiple) {
            closePopover();
          }
        });
    },
    [
      closePopover,
      onCreateOption,
      setValue,
      multiple,
      selectedValue,
      getOptionsByValues,
    ]
  );

  /**
   * Default render function for options in the list.
   * Displays icon (if provided), label, badge (if provided), description (if provided), and a checkmark icon when selected.
   * Can be overridden via renderOption prop.
   */
  const defaultRenderOption = useCallback(
    (option: ComboboxOption, selected: boolean) => (
      <div className="flex w-full items-center gap-2">
        {option.icon ? (
          <span className="flex size-4 items-center justify-center text-muted-foreground">
            {option.icon}
          </span>
        ) : null}
        <span className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <span className="truncate">{option.label}</span>
            {option.badge ? (
              <span className="shrink-0">{option.badge}</span>
            ) : null}
          </div>
          {option.description ? (
            <span className="truncate text-muted-foreground text-xs">
              {option.description}
            </span>
          ) : null}
        </span>
        <CheckIcon
          className={cn(
            'ml-2 size-4 shrink-0 text-muted-foreground transition-opacity',
            selected ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>
    ),
    []
  );

  /** Icon displayed on the trigger button (custom icon, loading spinner, or default chevron) */
  const triggerIcon = loading ? (
    <Loader2 className="ml-2 size-4 shrink-0 animate-spin opacity-50" />
  ) : (
    (icon ?? <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />)
  );

  const { className: commandClass, ...restCommandProps } = commandProps ?? {};
  const { className: inputClass, ...restInputProps } = inputProps ?? {};
  const { className: cmdInputClass, ...restCmdInputProps } = inputProps ?? {};

  /** Ref for the trigger container */
  const triggerContainerRef = useRef<HTMLDivElement>(null);
  /** Ref for the input element to maintain focus */
  const inputRef = useRef<HTMLInputElement>(null);
  /** Width of the trigger for matching popover width */
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(
    undefined
  );

  /** Ref for the Command component to access its internal state */
  const commandRef = useRef<HTMLDivElement>(null);

  /** Handles keyboard navigation: Backspace (delete last badge), Arrow keys (navigate), Enter (select) */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Handle backspace to delete last selected option
      if (e.key === 'Backspace' && search === '' && multiple) {
        const currentValues = selectedValue as string[];
        if (currentValues.length > 0) {
          e.preventDefault();
          const newValues = currentValues.slice(0, -1);
          const newOptions = getOptionsByValues(newValues);
          setValue(newValues, newOptions);
        }
        return;
      }

      // Handle arrow keys for navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!open) {
          return;
        }
        e.preventDefault();
        // Find all enabled CommandItems
        const items = Array.from(
          commandRef.current?.querySelectorAll(
            '[cmdk-item]:not([data-disabled="true"])'
          ) ?? []
        ) as HTMLElement[];
        if (items.length === 0) {
          return;
        }

        // Find currently selected item (cmdk uses aria-selected or data-selected)
        const currentIndex = items.findIndex(
          (item) =>
            item.getAttribute('data-selected') === 'true' ||
            item.getAttribute('aria-selected') === 'true'
        );
        let nextIndex: number;

        if (currentIndex === -1) {
          // No item selected, select first or last
          nextIndex = e.key === 'ArrowDown' ? 0 : items.length - 1;
        } else if (e.key === 'ArrowDown') {
          // Move to next item
          nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
          // Move to previous item
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }

        // Remove selection from all items
        for (const item of items) {
          item.setAttribute('data-selected', 'false');
          item.setAttribute('aria-selected', 'false');
        }
        // Select the new item
        const nextItem = items[nextIndex];
        if (nextItem) {
          nextItem.setAttribute('data-selected', 'true');
          nextItem.setAttribute('aria-selected', 'true');
          nextItem.scrollIntoView({ block: 'nearest' });
        }
        return;
      }

      // Handle Enter to select highlighted item
      if (e.key === 'Enter') {
        if (!open) {
          return;
        }
        e.preventDefault();
        const selectedItem = commandRef.current?.querySelector(
          '[cmdk-item][data-selected="true"], [cmdk-item][aria-selected="true"]'
        ) as HTMLElement;
        if (selectedItem) {
          // Click the item to trigger its onSelect handler
          selectedItem.click();
        }
        return;
      }
    },
    [search, multiple, selectedValue, getOptionsByValues, setValue, open]
  );

  return (
    <div className={cn('inline-flex', className)}>
      <Popover onOpenChange={handleOpenChange} open={open}>
        <PopoverTrigger asChild>
          <div
            aria-expanded={open}
            aria-haspopup="listbox"
            className={cn(
              'flex w-full min-w-0 gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
              (() => {
                if (multiple) {
                  if (maxMultiLines) {
                    return 'items-start overflow-hidden';
                  }
                  return 'items-start';
                }
                return 'h-9 items-center';
              })(),
              (multiple ? selectedOptions.length === 0 : !selectedOption) &&
                'text-muted-foreground',
              triggerClassName
            )}
            onClick={(e) => {
              // Prevents PopoverTrigger toggle, focuses input, opens if closed
              e.preventDefault();
              e.stopPropagation();
              if (disabled || loading) {
                return;
              }
              // Always focus the input
              inputRef.current?.focus();
              // Only open if closed - don't toggle
              if (!open) {
                handleOpenChange(true);
              }
            }}
            onKeyDown={(e) => {
              // Enter/Space opens combobox and focuses input (skips if input already focused)
              if (document.activeElement === inputRef.current) {
                return;
              }

              // Handle keyboard events when focused on the trigger list
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (disabled || loading) {
                  return;
                }
                inputRef.current?.focus();
                if (!open) {
                  handleOpenChange(true);
                }
              }
            }}
            ref={triggerContainerRef}
            role="combobox"
            style={(() => {
              // Calculates maxHeight for wrapping badges: maxMultiLines * 2.25rem + (maxMultiLines - 1) * 0.5rem
              if (multiple && maxMultiLines) {
                return {
                  minHeight: '2.25rem',
                  maxHeight: `${maxMultiLines * 2.25 + (maxMultiLines - 1) * 0.5}rem`,
                };
              }
              if (multiple) {
                return { minHeight: '2.25rem' };
              }
              return {};
            })()}
            tabIndex={disabled || loading ? -1 : 0}
          >
            <div
              className={cn(
                'flex min-w-0 flex-1 flex-wrap items-center gap-2',
                multiple && maxMultiLines && 'overflow-hidden'
              )}
              style={
                // Constrains inner container height to enable scrolling when badges wrap
                multiple && maxMultiLines
                  ? {
                      maxHeight: `${maxMultiLines * 2.25 + (maxMultiLines - 1) * 0.5}rem`,
                    }
                  : {}
              }
            >
              {multiple ? (
                // The items to show in the trigger for multi comboboxes
                <>
                  {selectedOptions.length > 0
                    ? selectedOptions.map((option, index) => (
                        <Badge
                          className={cn(
                            'shrink-0 truncate',
                            multiSortable && 'cursor-move'
                          )}
                          draggable={multiSortable}
                          key={option.value}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => {
                            handleDragOver(e, index);
                          }}
                          onDragStart={() => {
                            handleDragStart(index);
                          }}
                          variant="secondary"
                        >
                          {option.label}
                        </Badge>
                      ))
                    : null}
                  <Input
                    className={cn(
                      'h-auto min-w-[120px] flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0',
                      inputClass,
                      inputClassName
                    )}
                    disabled={disabled || loading}
                    onBlur={(e) => {
                      // Restores focus if clicking inside popover/trigger (keeps input focused during multi-select)
                      const relatedTarget = e.relatedTarget as Node | null;
                      const isInsidePopover =
                        relatedTarget &&
                        document
                          .querySelector('[role="dialog"]')
                          ?.contains(relatedTarget);
                      const isInsideTrigger =
                        relatedTarget &&
                        triggerContainerRef.current?.contains(relatedTarget);
                      if (isInsidePopover || isInsideTrigger) {
                        // Clicking inside the popover or trigger - restore focus
                        setTimeout(() => {
                          inputRef.current?.focus();
                        }, 0);
                      }
                    }}
                    onChange={(e) => {
                      handleSearchChange(e.target.value);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!open) {
                        handleOpenChange(true);
                      }
                    }}
                    onFocus={() => {
                      if (!open) {
                        handleOpenChange(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      // Stops propagation to prevent trigger from handling space/enter
                      e.stopPropagation();
                      handleKeyDown(e);
                    }}
                    placeholder={selectedOptions.length > 0 ? '' : placeholder}
                    ref={(node) => {
                      inputRef.current = node;
                      if (typeof ref === 'function') {
                        ref(node);
                      } else if (ref) {
                        (
                          ref as React.MutableRefObject<HTMLInputElement | null>
                        ).current = node;
                      }
                    }}
                    value={search}
                    {...restInputProps}
                  />
                </>
              ) : (
                // The items to show in the trigger for single comboboxes
                <span className="block flex-1 truncate text-left">
                  {renderSelectedValue
                    ? (
                        renderSelectedValue as (
                          option: ComboboxOption | null
                        ) => ComponentProps<'div'>['children']
                      )(selectedOption)
                    : (selectedOption?.label ?? placeholder)}
                </span>
              )}
            </div>
            {triggerIcon}
          </div>
        </PopoverTrigger>
        <PopoverContent
          align={align}
          className={cn('p-0', popoverContentClassName)}
          onMouseDown={(e) => {
            // Prevents input blur when clicking inside popover
            e.preventDefault();
          }}
          side={side}
          sideOffset={sideOffset}
          style={
            // Matches popover width to trigger (prevents shrinking when CommandInput is hidden in multi-select)
            triggerWidth
              ? { width: `${triggerWidth}px`, minWidth: '200px' }
              : { minWidth: '200px' }
          }
        >
          <Command
            {...restCommandProps}
            className={cn(
              'flex w-full flex-col',
              commandClass,
              commandClassName
            )}
            ref={commandRef}
          >
            {/** Hidden CommandInput in multi-select syncs search with cmdk filtering; visible in single-select */}
            {multiple ? (
              <div className="hidden">
                <CommandInput
                  onValueChange={handleSearchChange}
                  value={search}
                />
              </div>
            ) : (
              <CommandInput
                className={cn('h-9', cmdInputClass, inputClassName)}
                onValueChange={handleSearchChange}
                placeholder={searchPlaceholder}
                value={search}
                {...restCmdInputProps}
              />
            )}
            <CommandList
              className={cn('max-h-64 overflow-y-auto', listClassName)}
            >
              {/* Only show the empty state if we're not loading */}
              {!loadingResults && (
                <CommandEmpty className="py-3 text-center text-sm">
                  {emptyMessage}
                </CommandEmpty>
              )}
              {/* If we're loading results, show the loading indicator */}
              {loadingResults &&
                groups.some((group) => group.options.length > 0) && (
                  <div
                    aria-live="polite"
                    className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-sm"
                  >
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                    Loading results…
                  </div>
                )}
              {/* If we should allow clearing the selection, show the clear option */}
              {allowClear &&
                (multiple ? selectedOptions.length > 0 : selectedOption) && (
                  <CommandItem
                    onSelect={handleClear}
                    value={CLEAR_OPTION_VALUE}
                  >
                    {clearLabel}
                  </CommandItem>
                )}
              {/* If we have groups, show the groups */}
              {groups.map((group, index) => {
                if (!group.options.length) {
                  return null;
                }
                return (
                  <CommandGroup
                    heading={group.label}
                    key={group.label ?? index}
                  >
                    {group.options.map((option) => {
                      const selected = multiple
                        ? (selectedValue as string[]).includes(option.value)
                        : (selectedValue as string | null) === option.value;
                      return (
                        <CommandItem
                          disabled={option.disabled}
                          key={option.value}
                          keywords={[option.label, ...(option.keywords ?? [])]}
                          onSelect={() => handleSelect(option)}
                          value={option.value}
                        >
                          {(renderOption ?? defaultRenderOption)(
                            option,
                            selected
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })}
              {/* If we should show the create option, show it */}
              {showCreateOption ? (
                <CommandItem
                  onSelect={() => handleCreate(trimmedSearch)}
                  value={`__combobox-create__-${trimmedSearch}`}
                >
                  {createOptionLabel
                    ? createOptionLabel(trimmedSearch)
                    : `Create "${trimmedSearch}"`}
                </CommandItem>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

Combobox.displayName = 'Combobox';
