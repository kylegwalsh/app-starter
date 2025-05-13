/** A generic react component type (used to make children easily accessible) */
declare type Component<T = object> = React.PropsWithChildren<
  React.ComponentProps<T>
>;
