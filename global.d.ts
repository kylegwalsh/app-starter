/// <reference types="react" />

/**
 * Flexible React.FC type with overloads:
 * - FC - just standard component type + children
 * - FC<Props> - just custom props
 * - FC<typeof Component> - inherits the props from the referenced component
 * - FC<typeof Component, Props> - inherits the props from the referenced component + custom props
 */
declare type FC<T = object, P = never> = [P] extends [never]
  ? // biome-ignore lint/suspicious/noExplicitAny: We need to allow any for the component type
    T extends React.ComponentType<any>
    ? React.FC<React.PropsWithChildren<ComponentProps<T>>> // Just component type + children
    : React.FC<React.PropsWithChildren<T>> // Just props + children
  : React.FC<React.PropsWithChildren<ComponentProps<T> & P>>; // Component type + props + children
