export const clone =
	typeof structuredClone !== "undefined"
		? structuredClone
		: (value: any) => JSON.parse(JSON.stringify(value));
