import { createEstate } from "@e-state/react";

export const { useEstate, clearEstate, setEstates } = createEstate(
  {
    main: {
      session: null as null | { name: string; id: string },
      test: "",
    },
    persist: {
      text: 0,
    },
  },
  {
    persist: ["persist"],
    debag: false,
  },
);
