/// <reference types="react" />

/**
 * Flexible React.FC type with overloads:
 * - FC - just standard component type + children
 * - FC<Props> - just custom props
 * - FC<typeof Component> - inherits the props from the referenced component
 * - FC<typeof Component, Props> - inherits the props from the referenced component + custom props
 */
declare type FC<T = object, P = never> = [P] extends [never]
  ? T extends React.ComponentType<any>
    ? React.FC<React.PropsWithChildren<React.ComponentProps<T>>> // Just component type + children
    : React.FC<React.PropsWithChildren<T>> // Just props + children
  : React.FC<React.PropsWithChildren<React.ComponentProps<T> & P>>; // Component type + props + children

// Declare modules for packages that are missing types (try to avoid this)
declare module '@next/eslint-plugin-next';
