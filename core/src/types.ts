import { GlobalStore } from "./functions/GlobalStore";

export type RootStateType = Record<any, Record<any, any>>;
export type Middleware<
  RootState extends RootStateType,
  Slice extends keyof RootState,
  Key extends keyof RootState[Slice]
> =
  | RootState[Slice][Key]
  | ((args: {
      value: RootState[Slice][Key];
      slice: keyof RootState;
      key: keyof RootState[Slice];
      globalStore: GlobalStore<RootState>;
    }) => RootState[Slice][Key]);
export type Middlewares<RootState extends RootStateType> = {
  [slice in keyof RootState]?: {
    [key in keyof RootState[slice]]?: Middleware<RootState, slice, key>;
  };
};
export type Options<RootState extends RootStateType> = {
  persist?: (keyof RootState)[];
  storage?: {
    getItem(key: any): Promise<any> | any;
    setItem(key: any, value: any): Promise<void> | void;
  };
  middlewares?: Middlewares<RootState>;
  debag?: boolean;
};
export type NotFullSlice<
  RootState extends RootStateType,
  Slice extends keyof RootState
> = { [key in keyof RootStateType[Slice]]?: RootStateType[Slice][key] };

export type NotFullRootState<RootState extends RootStateType> = {
  [slice in keyof RootState]?: NotFullSlice<RootState, slice>;
};
export type PayloadReturnValue<T> = T;
export type Promiseable<T> = Promise<T> | T;
export type SetterFunction<T> = (
  currentValue: T,
) => Promiseable<PayloadReturnValue<T>>;
export type PayloadValue<
  RootState extends RootStateType,
  Slice extends keyof RootState,
  Key extends keyof RootState[Slice]
> = RootState[Slice][Key] | SetterFunction<RootState[Slice][Key]>;

export type Payload<
  RootState extends RootStateType,
  Slice extends keyof RootState
> = {
  [key in keyof RootState[Slice]]?: PayloadValue<RootState, Slice, key>;
};
export type ListenerCallback = <
  Store extends RootStateType,
  Slice extends keyof Store,
  Key extends keyof Store[Slice]
>(args: {
  slice: Slice;
  key: Key;
  updateId: string;
  // oldValue: Store[Slice][Key];
}) => void;
export type ListenerCompare = (oldValue: any, newValue: any) => boolean;
export type SetEstates<RootState extends RootStateType> = {
  [slice in keyof RootState]: (
    payload: Payload<RootState, slice>,
    forceRenderer?: boolean
  ) => SetEstates<RootState>;
};
