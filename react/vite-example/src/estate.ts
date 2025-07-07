import { createEstate } from "@e-state/react";

export const { useEstate, clearEstate, setEstates } = createEstate(
  {
    main: {
      session: null as null | { name: string; id: string },
      test: "",
      foo: undefined,
    },
    persist: {
      count1: 0,
      count2: 0,
      count3: 0,
      obj: new Map([
        [
          "a",
          {
            a: 1,
            b: 2,
            c: 3,
          },
        ],
        [
          "b",
          {
            a: 1,
            b: 2,
            c: 3,
          },
        ],
        [
          "c",
          {
            a: 1,
            b: 2,
            c: 3,
          },
        ],
      ]),
    },
  },
  {
    persist: ["persist"],
    debag: false,
  }
);
