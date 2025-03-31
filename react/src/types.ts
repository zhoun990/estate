import { RootStateType } from "@e-state/core";

export type Getter<T> = () => T;
export type Setter<T> = (payload: T, forceRenderer?: boolean) => void;

export type SetterFunction<T, RootState> = (
  currentValue: T,
  rootState: RootState
) => ReturnValue<T>;
type ReturnValue<T> = Promise<T> | T;
export type SetEstates<RootState extends RootStateType> = {
  [slice in keyof RootState]: Setter<{
    [key in keyof RootState[slice]]?:
      | RootState[slice][key]
      | SetterFunction<RootState[slice][key], RootState>;
  }>;
};
export type DependencyList = readonly unknown[];
