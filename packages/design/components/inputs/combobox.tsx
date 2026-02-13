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
import { Popover, PopoverContent, PopoverTrigger } from '@repo/design/components/ui/popover';
import { cn } from '@repo/design/lib/utils';
import { CheckIcon, ChevronsUpDownIcon, Loader2, XIcon } from 'lucide-react';
import {
  type ComponentProps,
  type Ref,
  useCallback,
  useEffect,
  useId,
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
  /** Whether the combobox is searchable. When false, hides the search input and shows all options. Defaults to true. */
  searchable?: boolean;
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
    searchValue: string,
  ) => undefined | ComboboxOption | Promise<undefined | ComboboxOption>;
  /** Custom render function for the create option label */
  createOptionLabel?: (searchValue: string) => ComponentProps<'div'>['children'];
  /** Whether to hide create option when an exact match exists */
  hideCreateWhenOptionExists?: boolean;
  /** Custom render function for each option in the list */
  renderOption?: (option: ComboboxOption, selected: boolean) => ComponentProps<'div'>['children'];
  /** Custom icon to display on the trigger button */
  icon?: ComponentProps<'div'>['children'];
  /** Additional props passed to the Command component */
  commandProps?: Omit<ComponentProps<typeof Command>, 'children'>;
  /** Additional props passed to the search Input component */
  inputProps?: Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'placeholder'>;
  /** Ref forwarded to the search input element */
  ref?: Ref<HTMLInputElement>;
  /** Whether to constrain the trigger and popover to match the trigger width. When true, text truncates and popover width matches trigger. When false (default), trigger and popover can expand to fit content. */
  matchTriggerWidth?: boolean;
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
      renderSelectedValue?: (option: ComboboxOption | null) => ComponentProps<'div'>['children'];
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
      renderSelectedValue?: (options: ComboboxOption[]) => ComponentProps<'div'>['children'];
    });

/** Special value used to identify the "clear" option in the command list. Allows us to distinguish between clearing the selection and selecting an actual option. */
const CLEAR_OPTION_VALUE = '__combobox-clear__';

/** Type guard to check if options are grouped or flat. Returns true if the first element has an 'options' property (indicating groups). */
const isOptionGroupArray = (
  options: ComboboxOption[] | ComboboxOptionGroup[],
): options is ComboboxOptionGroup[] => options.length > 0 && 'options' in options[0];

export type { ComboboxOption, ComboboxOptionGroup, ComboboxProps };

// ─── Private sub-components ──────────────────────────────────────────

/** Trigger content for single-select mode */
const SingleTriggerContent = ({
  selectedOption,
  renderSelectedValue,
  placeholder,
  matchTriggerWidth,
}: {
  selectedOption: ComboboxOption | null;
  renderSelectedValue:
    | ((option: ComboboxOption | null) => ComponentProps<'div'>['children'])
    | undefined;
  placeholder: string;
  matchTriggerWidth: boolean;
}) => (
  <span className={cn('block flex-1 text-left', matchTriggerWidth && 'truncate')}>
    {renderSelectedValue
      ? renderSelectedValue(selectedOption)
      : (selectedOption?.label ?? placeholder)}
  </span>
);

/** Badge list + inline search input for multi-select mode */
const MultiBadgeList = ({
  selectedOptions,
  renderSelectedValue,
  placeholder,
  searchable,
  isInputFocused,
  search,
  open,
  multiSortable,
  disabled,
  loading,
  inputClassName,
  inputClass,
  restInputProps,
  inputRef,
  forwardedRef,
  popoverContentRef,
  triggerContainerRef,
  handleSearchChange,
  handleOpenChange,
  handleKeyDown,
  handleRemoveBadge,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  setIsInputFocused,
}: {
  selectedOptions: ComboboxOption[];
  renderSelectedValue:
    | ((options: ComboboxOption[]) => ComponentProps<'div'>['children'])
    | undefined;
  placeholder: string;
  searchable: boolean;
  isInputFocused: boolean;
  search: string;
  open: boolean;
  multiSortable: boolean;
  disabled: boolean;
  loading: boolean;
  inputClassName: string | undefined;
  inputClass: string | undefined;
  restInputProps: Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'placeholder'>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  forwardedRef: Ref<HTMLInputElement> | undefined;
  popoverContentRef: React.RefObject<HTMLDivElement | null>;
  triggerContainerRef: React.RefObject<HTMLDivElement | null>;
  handleSearchChange: (value: string) => void;
  handleOpenChange: (open: boolean) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleRemoveBadge: (optionValue: string) => void;
  handleDragStart: (index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
  setIsInputFocused: (focused: boolean) => void;
}) => {
  if (renderSelectedValue) {
    if (selectedOptions.length > 0) {
      return <span className="truncate py-[1px]">{renderSelectedValue(selectedOptions)}</span>;
    }
    return <span className="text-muted-foreground py-[1px]">{placeholder}</span>;
  }

  return (
    <>
      {selectedOptions.length > 0
        ? selectedOptions.map((option, index) => (
            <Badge
              className={cn('shrink-0 gap-0.5 truncate pr-0.5', multiSortable && 'cursor-move')}
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
              <span className="mx-0.5 h-3 w-px bg-current opacity-20" />
              <button
                aria-label={`Remove ${option.label}`}
                className="focus-visible:ring-ring rounded-sm opacity-50 transition-opacity hover:opacity-100 focus-visible:ring-1 focus-visible:outline-none"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemoveBadge(option.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onPointerDown={(e) => {
                  // Prevent drag behavior when clicking the remove button
                  e.stopPropagation();
                }}
                type="button"
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))
        : null}
      {selectedOptions.length === 0 && (!searchable || (!isInputFocused && !search && !open)) && (
        <span className="text-muted-foreground self-center py-[1px]">{placeholder}</span>
      )}
      {searchable && (isInputFocused || search || open) && (
        <Input
          className={cn(
            'h-auto min-w-[120px] flex-1 border-0 bg-transparent p-0 py-[1px] text-sm shadow-none focus-visible:ring-0',
            inputClass,
            inputClassName,
          )}
          disabled={disabled || loading}
          onBlur={(e) => {
            // Restores focus if clicking inside popover/trigger (keeps input focused during multi-select)
            const relatedTarget = e.relatedTarget as Node | null;
            const isInsidePopover =
              relatedTarget && popoverContentRef.current?.contains(relatedTarget);
            const isInsideTrigger =
              relatedTarget && triggerContainerRef.current?.contains(relatedTarget);
            if (isInsidePopover || isInsideTrigger) {
              setIsInputFocused(true);
              setTimeout(() => {
                inputRef.current?.focus();
              }, 0);
            } else {
              setIsInputFocused(false);
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
            setIsInputFocused(true);
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
            if (typeof forwardedRef === 'function') {
              forwardedRef(node);
            } else if (forwardedRef) {
              (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
            }
          }}
          value={search}
          {...restInputProps}
        />
      )}
    </>
  );
};

// ─── Main component ──────────────────────────────────────────────────

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
  searchable = true,
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
  matchTriggerWidth = false,
}: ComboboxProps) => {
  const listboxId = useId();

  // Normalize options into groups format for consistent processing
  const groups = useMemo<ComboboxOptionGroup[]>(() => {
    if (isOptionGroupArray(options)) {
      return options;
    }
    return [{ options }];
  }, [options]);

  // Flatten all groups into a single array for easier searching and value lookup
  const flattenedOptions = useMemo(() => groups.flatMap((group) => group.options), [groups]);

  /** Whether value is controlled (via props) or uncontrolled (internal state) */
  const isValueControlled = controlledValue !== undefined;

  // Internal state for single and multi combobox
  const [uncontrolledValueSingle, setUncontrolledValueSingle] = useState<string | null>(
    multiple ? null : ((defaultValue as string | null | undefined) ?? null),
  );
  const [uncontrolledValueMultiple, setUncontrolledValueMultiple] = useState<string[]>(
    multiple ? ((defaultValue as string[] | undefined) ?? []) : [],
  );

  /** Helper to get options by values array */
  const getOptionsByValues = useCallback(
    (values: string[]) =>
      values
        .map((val) => flattenedOptions.find((opt) => opt.value === val))
        .filter((opt): opt is ComboboxOption => opt !== undefined),
    [flattenedOptions],
  );

  /** Finds an option by its value string. Returns null if no option matches or if value is null/undefined. */
  const getOptionByValue = useCallback(
    (optionValue: string | null) => {
      if (!optionValue) {
        return null;
      }
      return flattenedOptions.find((option) => option.value === optionValue) ?? null;
    },
    [flattenedOptions],
  );

  const multi = useMemo(() => {
    if (!multiple) {
      return null;
    }
    const values: string[] = isValueControlled
      ? ((controlledValue as string[] | undefined) ?? [])
      : uncontrolledValueMultiple;
    return {
      values,
      options: getOptionsByValues(values),
      set(nextValues: string[], nextOptions: ComboboxOption[]) {
        if (!isValueControlled) {
          setUncontrolledValueMultiple(nextValues);
        }
        (onChange as ((v: string[], o: ComboboxOption[]) => void) | undefined)?.(
          nextValues,
          nextOptions,
        );
      },
    };
  }, [
    multiple,
    isValueControlled,
    controlledValue,
    uncontrolledValueMultiple,
    getOptionsByValues,
    onChange,
  ]);

  const single = useMemo(() => {
    if (multiple) {
      return null;
    }
    const value: string | null = isValueControlled
      ? ((controlledValue as string | null | undefined) ?? null)
      : uncontrolledValueSingle;
    return {
      value,
      option: getOptionByValue(value),
      set(nextValue: string | null, nextOption: ComboboxOption | null) {
        if (!isValueControlled) {
          setUncontrolledValueSingle(nextValue);
        }
        (onChange as ((v: string | null, o: ComboboxOption | null) => void) | undefined)?.(
          nextValue,
          nextOption,
        );
      },
    };
  }, [
    multiple,
    isValueControlled,
    controlledValue,
    uncontrolledValueSingle,
    getOptionByValue,
    onChange,
  ]);

  // Convenience aliases derived from the narrowed objects
  const selectedOptions = multi?.options ?? [];
  const selectedOption = single?.option ?? null;

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
    [isOpenControlled, onOpenChange],
  );

  // Current search query entered
  const [search, setSearch] = useState('');
  // Track if the input is focused to conditionally render it
  const [isInputFocused, setIsInputFocused] = useState(false);

  /** Handles search query changes, updating internal state and calling onSearchChange callback */
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      onSearchChange?.(value);
    },
    [onSearchChange],
  );

  /** Closes the popover and clears the search query. Called after selection or when user cancels. */
  const closePopover = useCallback(() => {
    handleOpenChange(false);
    // Delay clearing search to allow popover to close first (prevents flash of unfiltered options)
    setTimeout(() => {
      setSearch('');
      onSearchChange?.('');
    }, 150);
  }, [handleOpenChange, onSearchChange]);

  // Clear search when searchable becomes false
  useEffect(() => {
    if (!searchable && search) {
      setSearch('');
      onSearchChange?.('');
    }
  }, [searchable, search, onSearchChange]);

  /** Ref for the trigger container */
  const triggerContainerRef = useRef<HTMLDivElement>(null);
  /** Ref for the popover content to scope blur checks */
  const popoverContentRef = useRef<HTMLDivElement>(null);
  /** Ref for the input element to maintain focus */
  const inputRef = useRef<HTMLInputElement>(null);
  /** Width of the trigger for matching popover width */
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>();
  /** Ref for the Command component to access its internal state */
  const commandRef = useRef<HTMLDivElement>(null);

  /** Focuses the appropriate search input (multi: Input ref, single: cmdk CommandInput) */
  const focusInput = useCallback(() => {
    if (multiple && searchable && inputRef.current) {
      inputRef.current.focus();
    } else if (!multiple && searchable) {
      const commandInput = commandRef.current?.querySelector(
        'input[cmdk-input]',
      ) as HTMLInputElement;
      commandInput?.focus();
    }
  }, [multiple, searchable]);

  // Handle the open and close state of the popover
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        focusInput();
        if (multiple && searchable) {
          setIsInputFocused(true);
        }
      }, 0);
      if (triggerContainerRef.current) {
        setTriggerWidth(triggerContainerRef.current.offsetWidth);
      }
    } else {
      closePopover();
    }
  }, [open, multiple, searchable, closePopover, focusInput]);

  /** Handles selection of an option from the list. In multiple mode, toggles selection. In single mode, selects or deselects based on allowDeselect. Disabled options are ignored. */
  const handleSelect = useCallback(
    (option: ComboboxOption) => {
      if (option.disabled) {
        return;
      }

      if (multi) {
        isSelectingRef.current = true;
        const isSelected = multi.values.includes(option.value);
        const nextValues = isSelected
          ? multi.values.filter((v) => v !== option.value)
          : [...multi.values, option.value];
        const nextOptions = getOptionsByValues(nextValues);
        multi.set(nextValues, nextOptions);
        setTimeout(() => {
          inputRef.current?.focus();
          isSelectingRef.current = false;
        }, 0);
      } else if (single) {
        let nextValue: string | null = option.value;
        let nextOption: ComboboxOption | null = option;

        if (allowDeselect && single.value === option.value) {
          nextValue = null;
          nextOption = null;
        }

        single.set(nextValue, nextOption);
        closePopover();
      }
    },
    [allowDeselect, multi, single, getOptionsByValues, closePopover],
  );

  /** Handles clearing the current selection via the "Clear" option. */
  const handleClear = useCallback(() => {
    if (multi) {
      multi.set([], []);
    } else if (single) {
      single.set(null, null);
    }
    closePopover();
  }, [closePopover, multi, single]);

  const handleRemoveBadge = useCallback(
    (optionValue: string) => {
      if (!multi) {
        return;
      }
      const nextValues = multi.values.filter((v) => v !== optionValue);
      const nextOptions = getOptionsByValues(nextValues);
      multi.set(nextValues, nextOptions);
    },
    [multi, getOptionsByValues],
  );

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
    [canDrag],
  );

  /** Tracks drop target during drag (doesn't reorder until drop) */
  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      if (!canDrag || draggedIndex === null) {
        return;
      }
      e.preventDefault();
      if (draggedIndex !== index) {
        setDropTargetIndex(index);
      }
    },
    [canDrag, draggedIndex],
  );

  /** Applies reordering when drag ends */
  const handleDragEnd = useCallback(() => {
    if (
      multi &&
      draggedIndex !== null &&
      dropTargetIndex !== null &&
      draggedIndex !== dropTargetIndex
    ) {
      const newOptions = [...multi.options];
      const draggedOption = newOptions[draggedIndex];
      newOptions.splice(draggedIndex, 1);
      newOptions.splice(dropTargetIndex, 0, draggedOption);

      const newValues = newOptions.map((opt) => opt.value);
      multi.set(newValues, newOptions);
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  }, [draggedIndex, dropTargetIndex, multi]);

  const trimmedSearch = useMemo(() => search.trim(), [search]);
  const lowerSearch = useMemo(() => trimmedSearch.toLowerCase(), [trimmedSearch]);

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

  /** Determines whether to show the "create new option" item. */
  const showCreateOption = Boolean(
    onCreateOption && trimmedSearch && !(hideCreateWhenOptionExists && hasExactMatch),
  );

  /** Handles creation of a new option from the search query. */
  const handleCreate = useCallback(
    async (searchValue: string) => {
      if (!onCreateOption) {
        return;
      }

      try {
        const created = await onCreateOption(searchValue);
        if (created) {
          if (multi) {
            const nextValues = [...multi.values, created.value];
            const nextOptions = getOptionsByValues(nextValues);
            multi.set(nextValues, nextOptions);
          } else if (single) {
            single.set(created.value, created);
          }
        }
      } finally {
        if (!multiple) {
          closePopover();
        }
      }
    },
    [closePopover, onCreateOption, multi, single, multiple, getOptionsByValues],
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
          <span className="text-muted-foreground flex size-4 items-center justify-center">
            {option.icon}
          </span>
        ) : null}
        <span className={cn('flex flex-1 flex-col', matchTriggerWidth && 'min-w-0')}>
          <div className="flex items-center gap-2">
            <span className={cn(matchTriggerWidth && 'truncate')}>{option.label}</span>
            {option.badge ? <span className="shrink-0">{option.badge}</span> : null}
          </div>
          {option.description ? (
            <span className={cn('text-muted-foreground text-xs', matchTriggerWidth && 'truncate')}>
              {option.description}
            </span>
          ) : null}
        </span>
        <CheckIcon
          className={cn(
            'ml-2 size-4 shrink-0 text-muted-foreground transition-opacity',
            selected ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>
    ),
    [matchTriggerWidth],
  );

  /** Icon displayed on the trigger button (custom icon, loading spinner, or default chevron) */
  const triggerIcon = loading ? (
    <Loader2 className="ml-2 size-4 animate-spin opacity-50" />
  ) : (
    (icon ?? <ChevronsUpDownIcon className="ml-2 size-4 opacity-50" />)
  );

  const { className: commandClass, ...restCommandProps } = commandProps ?? {};
  const { className: inputClass, ...restInputProps } = inputProps ?? {};

  /** Handles keyboard navigation: Backspace (delete last badge), Arrow keys (navigate), Enter (select) */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Handle backspace to delete last selected option
      if (e.key === 'Backspace' && search === '' && multi) {
        if (multi.values.length > 0) {
          e.preventDefault();
          const newValues = multi.values.slice(0, -1);
          const newOptions = getOptionsByValues(newValues);
          multi.set(newValues, newOptions);
        }
        return;
      }

      // Handle arrow keys for navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!open) {
          return;
        }
        e.preventDefault();
        const items = [
          ...(commandRef.current?.querySelectorAll('[cmdk-item]:not([data-disabled="true"])') ??
            []),
        ] as HTMLElement[];
        if (items.length === 0) {
          return;
        }

        const currentIndex = items.findIndex(
          (item) =>
            item.dataset.selected === 'true' || item.getAttribute('aria-selected') === 'true',
        );
        let nextIndex: number;

        if (currentIndex === -1) {
          nextIndex = e.key === 'ArrowDown' ? 0 : items.length - 1;
        } else if (e.key === 'ArrowDown') {
          nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }

        for (const item of items) {
          item.dataset.selected = 'false';
          item.setAttribute('aria-selected', 'false');
        }
        const nextItem = items[nextIndex];
        if (nextItem) {
          nextItem.dataset.selected = 'true';
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
          '[cmdk-item][data-selected="true"], [cmdk-item][aria-selected="true"]',
        ) as HTMLElement;
        if (selectedItem) {
          selectedItem.click();
        }
        return;
      }
    },
    [search, multi, getOptionsByValues, open],
  );

  let triggerLayoutClass: string;
  if (multiple) {
    triggerLayoutClass = maxMultiLines ? 'items-start overflow-hidden' : 'items-start';
  } else {
    triggerLayoutClass = 'h-9 items-center';
  }

  let triggerStyle: React.CSSProperties;
  if (multiple) {
    triggerStyle = maxMultiLines
      ? {
          minHeight: '2.25rem',
          maxHeight: `${maxMultiLines * 2.25 + (maxMultiLines - 1) * 0.5}rem`,
        }
      : { minHeight: '2.25rem' };
  } else {
    triggerStyle = {};
  }

  const popoverStyle: React.CSSProperties =
    matchTriggerWidth && triggerWidth
      ? { width: `${triggerWidth}px`, minWidth: '200px' }
      : { minWidth: triggerWidth ? `${triggerWidth}px` : '200px' };

  return (
    <div className={cn('flex min-w-0', className)}>
      <Popover onOpenChange={handleOpenChange} open={open}>
        <PopoverTrigger asChild>
          <div
            aria-controls={open ? listboxId : undefined}
            aria-expanded={open}
            className={cn(
              'flex w-full gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-within:border-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
              matchTriggerWidth && 'min-w-0',
              triggerLayoutClass,
              (multiple ? selectedOptions.length === 0 : !selectedOption) &&
                'text-muted-foreground',
              triggerClassName,
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (disabled || loading) {
                return;
              }
              focusInput();
              if (!open) {
                handleOpenChange(true);
              }
            }}
            onKeyDown={(e) => {
              if (multiple && document.activeElement === inputRef.current) {
                return;
              }
              if (
                !multiple &&
                commandRef.current?.querySelector('input[cmdk-input]') === document.activeElement
              ) {
                return;
              }

              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (disabled || loading) {
                  return;
                }
                focusInput();
                if (!open) {
                  handleOpenChange(true);
                }
              }
            }}
            ref={triggerContainerRef}
            role="combobox"
            style={triggerStyle}
            tabIndex={disabled || loading ? -1 : 0}
          >
            <div
              className={cn(
                'flex flex-1 flex-wrap items-center gap-2',
                matchTriggerWidth && 'min-w-0',
                multiple && maxMultiLines && 'overflow-hidden',
                multiple && 'py-0.5',
              )}
              style={
                multiple && maxMultiLines
                  ? {
                      maxHeight: `${maxMultiLines * 2.25 + (maxMultiLines - 1) * 0.5}rem`,
                    }
                  : {}
              }
            >
              {multiple ? (
                <MultiBadgeList
                  disabled={disabled}
                  forwardedRef={ref}
                  handleDragEnd={handleDragEnd}
                  handleDragOver={handleDragOver}
                  handleDragStart={handleDragStart}
                  handleKeyDown={handleKeyDown}
                  handleOpenChange={handleOpenChange}
                  handleRemoveBadge={handleRemoveBadge}
                  handleSearchChange={handleSearchChange}
                  inputClass={inputClass}
                  inputClassName={inputClassName}
                  inputRef={inputRef}
                  isInputFocused={isInputFocused}
                  loading={loading}
                  multiSortable={multiSortable}
                  open={open}
                  placeholder={placeholder}
                  popoverContentRef={popoverContentRef}
                  renderSelectedValue={
                    renderSelectedValue as
                      | ((options: ComboboxOption[]) => ComponentProps<'div'>['children'])
                      | undefined
                  }
                  restInputProps={restInputProps}
                  search={search}
                  searchable={searchable}
                  selectedOptions={selectedOptions}
                  setIsInputFocused={setIsInputFocused}
                  triggerContainerRef={triggerContainerRef}
                />
              ) : (
                <SingleTriggerContent
                  matchTriggerWidth={matchTriggerWidth}
                  placeholder={placeholder}
                  renderSelectedValue={
                    renderSelectedValue as
                      | ((option: ComboboxOption | null) => ComponentProps<'div'>['children'])
                      | undefined
                  }
                  selectedOption={selectedOption}
                />
              )}
            </div>
            <div className="shrink-0 self-center">{triggerIcon}</div>
          </div>
        </PopoverTrigger>
        <PopoverContent
          align={align}
          className={cn('p-0', !matchTriggerWidth && 'w-fit', popoverContentClassName)}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          ref={popoverContentRef}
          side={side}
          sideOffset={sideOffset}
          style={popoverStyle}
        >
          <Command
            {...restCommandProps}
            className={cn('flex w-full flex-col', commandClass, commandClassName)}
            ref={commandRef}
          >
            {searchable &&
              (multiple ? (
                <div className="hidden">
                  <CommandInput onValueChange={handleSearchChange} value={search} />
                </div>
              ) : (
                <CommandInput
                  className={cn('h-9', inputClassName)}
                  onValueChange={handleSearchChange}
                  placeholder={searchPlaceholder}
                  value={search}
                />
              ))}
            <CommandList className={cn('max-h-64 overflow-y-auto', listClassName)} id={listboxId}>
              {!loadingResults && !onCreateOption && (
                <CommandEmpty className="text-muted-foreground py-3 text-center text-sm">
                  {emptyMessage}
                </CommandEmpty>
              )}
              {loadingResults && groups.some((group) => group.options.length > 0) && (
                <div
                  aria-live="polite"
                  className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm"
                >
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  Loading results…
                </div>
              )}
              {allowClear && (multiple ? selectedOptions.length > 0 : selectedOption) && (
                <CommandItem onSelect={handleClear} value={CLEAR_OPTION_VALUE}>
                  {clearLabel}
                </CommandItem>
              )}
              {groups.map((group) => {
                if (!group.options.length) {
                  return null;
                }
                return (
                  <CommandGroup
                    heading={group.label}
                    key={group.label ?? `group-${group.options[0]?.value}`}
                  >
                    {group.options.map((option) => {
                      const selected = multi
                        ? multi.values.includes(option.value)
                        : single?.value === option.value;
                      return (
                        <CommandItem
                          disabled={option.disabled}
                          key={option.value}
                          keywords={[option.label, ...(option.keywords ?? [])]}
                          onSelect={() => handleSelect(option)}
                          value={option.value}
                        >
                          {(renderOption ?? defaultRenderOption)(option, selected)}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })}
              {showCreateOption ? (
                <CommandGroup forceMount>
                  <CommandItem
                    onSelect={() => handleCreate(trimmedSearch)}
                    value={`__combobox-create__-${trimmedSearch}`}
                  >
                    {createOptionLabel
                      ? createOptionLabel(trimmedSearch)
                      : `Create "${trimmedSearch}"`}
                  </CommandItem>
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

Combobox.displayName = 'Combobox';
