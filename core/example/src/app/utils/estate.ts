import { createEstate } from "@e-state/core";
export const { set, store, clearEstate ,subscribe} = createEstate(
	{
		main: {
			session: null as null | { name: string; id: string },
			test: "",
		},
		persist: {
			text: "abc",
		},
	},
	{
		persist: ["persist", "main"],
	}
);
