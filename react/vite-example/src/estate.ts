import { createEstate } from "@e-state/react";

export const { useEstate, clearEstate, setEstates } = createEstate(
  {
    main: {
      session: null as null | { name: string; id: string },
      test: "",
      foo: undefined,
    },
    persist: {
      count: 0,
      count2: 0,
    },
  },
  {
    persist: ["persist"],
  }
);
