# Example

```typescript app/utils/estate.ts
export const { useEstate, clearEstate } = createEstate<{
	main: { drawer: boolean; items: { title: string; id: string }[] };
	sub: { title: string; name: string };
}>({
	main: {
		drawer: false,
		items: [],
	},
	sub: {
		title: "",
		name: "",
	},
});
```

```typescript app/utils/estate.ts
const initialState: {
	main: { drawer: boolean; items: { title: string; id: string }[] };
	sub: { title: string; name: string };
} = {
	main: {
		drawer: false,
		items: [],
	},
	sub: {
		title: "",
		name: "",
	},
};
export const { useEstate, clearEstate } = createEstate(initialState);
```

```typescript app/page.tsx
"use client";
export default function Page() {
	const { drawer, setEstate } = useEstate("main");
	return (
		<>
			{drawer && <Drawer />}
			<button
				onClick={() => {
					setEstate({ drawer: (currentValue) => !currentValue });
				}}
			>
				{drawer ? "Close Drawer" : "Open Drawer"}
			</button>
		</>
	);
}
```
