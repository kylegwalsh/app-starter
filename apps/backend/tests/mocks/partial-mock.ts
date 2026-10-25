/** Recursively makes every property optional, including items inside arrays */
type DeepPartial<T> = T extends (infer Item)[]
  ? DeepPartial<Item>[]
  : T extends object
    ? { [Key in keyof T]?: DeepPartial<T[Key]> }
    : T;

/**
 * Mock signature for an async function that keeps its real argument types but allows resolving
 * a partial result, so tests only define the fields they use while still type-checking them.
 * Use with `vi.fn<PartialMock<typeof fn>>()`.
 */
export type PartialMock<Fn extends (...args: never[]) => Promise<unknown>> = (
  ...args: Parameters<Fn>
) => Promise<DeepPartial<Awaited<ReturnType<Fn>>>>;
