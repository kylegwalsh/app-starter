/// <reference types="react" />

/**
 * Flexible React.FC type with overloads:
 * - FC - just standard component type + children
 * - FC<Props> - just custom props
 * - FC<typeof Component> - inherits the props from the referenced component
 * - FC<typeof Component, Props> - inherits the props from the referenced component + custom props
 */
declare type FC<T = object, P = never> = [P] extends [never]
  ? // oxlint-disable no-explicit-any: We need to allow any to allow for flexible extensions
    T extends React.ComponentType<any>
    ? React.FC<React.PropsWithChildren<React.ComponentProps<T>>> // Just component type + children
    : React.FC<React.PropsWithChildren<T>> // Just props + children
  : React.FC<React.PropsWithChildren<React.ComponentProps<T> & P>>; // Component type + props + children
