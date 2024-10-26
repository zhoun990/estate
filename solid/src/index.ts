"use client";

import { Accessor, Setter, createSignal } from "solid-js";
import { RootStateType, Options, SetEstates } from "./types";
import { makePersisted } from "@solid-primitives/storage";

export const initEstate = <RootState extends RootStateType>(
  initialRootState: RootState,
  options?: Options<RootState>,
) => {
  const store = {} as {
    [slice in keyof RootState]: {
      [key in keyof RootState[slice]]: Accessor<RootState[slice][key]>;
    };
  };
  const setters = {} as {
    [slice in keyof RootState]: {
      [key in keyof RootState[slice]]: Setter<RootState[slice][key]>;
    };
  };
  const setEstates = {} as SetEstates<RootState>;
  for (const slice in initialRootState) {
    const isPersisted = options?.persist?.includes(slice) || false;
    if (Object.prototype.hasOwnProperty.call(initialRootState, slice)) {
      const sliceState = initialRootState[slice];
      if (!Object.prototype.hasOwnProperty.call(store, slice)) {
        store[slice] = {} as RootState[typeof slice];
      }
      if (!Object.prototype.hasOwnProperty.call(setters, slice)) {
        setters[slice] = {} as RootState[typeof slice];
      }
      for (const key in sliceState) {
        if (Object.prototype.hasOwnProperty.call(sliceState, key)) {
          const [getter, setter] = isPersisted
            ? makePersisted(createSignal(sliceState[key]))
            : createSignal(sliceState[key]);
          setter;
          store[slice][key] = getter;
          setters[slice][key] = setter;
        }
      }
      setEstates[slice] = (payload) => {
        for (const key in payload) {
          if (Object.prototype.hasOwnProperty.call(payload, key)) {
            setters[slice][key](payload[key]!);
          }
        }
        return setEstates;
      };
    }
  }

  const createEstate = <Slice extends keyof RootState>(slice: Slice) => {
    return { ...store[slice], setEstate: setEstates[slice] };
  };
  return { store, createEstate, setEstates };
};
