import { Setter } from "solid-js";

export type RootStateType = Record<any, Record<any, any>>;
type Payload<RootState extends RootStateType, Slice extends keyof RootState> = {
  [key in keyof RootState[Slice]]?: Parameters<Setter<RootState[Slice][key]>>[0];
};
export type Options<RootState extends RootStateType> = {
  persist?: (keyof RootState)[];
  storage?: {
    getItem(key: any): Promise<any> | any;
    setItem(key: any, value: any): Promise<void> | void;
  };
};
export type SetEstates<RootState extends RootStateType> = {
  [slice in keyof RootState]: (
    payload: Payload<RootState, slice>,
  ) => SetEstates<RootState>;
};
