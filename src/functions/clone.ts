export const clone: <T = any>(
	value: T,
	options?: StructuredSerializeOptions | undefined
) => T =
	typeof structuredClone !== "undefined"
		? structuredClone
		: (value: any) => JSON.parse(JSON.stringify(value));
