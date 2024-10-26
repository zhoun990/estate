import { initEstate } from "@e-state/solid";

export const { createEstate, setEstates } = initEstate(
  {
    main: { count: 0 },
    persist: {
      page: 0,
    },
  },
  {
    persist: ["persist"],
  },
);
