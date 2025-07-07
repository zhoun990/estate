export { SetterFunction, SetEstates } from "@e-state/core";

export type Getter<T> = () => T;
export type Setter<T> = (payload: T, forceRenderer?: boolean) => void;
export type DependencyList = readonly unknown[];
