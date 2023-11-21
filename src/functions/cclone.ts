export const clone =
	structuredClone || ((value) => JSON.parse(JSON.stringify(value)));
