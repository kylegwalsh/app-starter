/** A generic react component type (used to make children easily accessible) */
declare type Component<T = object> = React.PropsWithChildren<React.ComponentProps<T>>;

// Declare modules for packages that are missing types (try to avoid this)
declare module '@next/eslint-plugin-next';
