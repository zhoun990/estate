import { createEstate } from "@webbe1/estate";
export const { useEstate, clearEstate } = createEstate(
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
		persist: ["persist"],
	}
);
