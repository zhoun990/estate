# @e-state/react

Estate is a React state management library designed for simplicity and ease of use.

## Installation
```bash
npm install @e-state/react
# or
yarn add @e-state/react
```
## Getting Started
First, you need to initialize module and export a hook.
```typescript app/utils/estate.ts
export const { useEstate, clearEstate } = createEstate<{
	main: { drawer: boolean; items: { title: string; id: string }[] };
	sub: { title: string; name: string };
}>(
	{
		main: {
			drawer: false,
			items: [],
		},
		sub: {
			title: "",
			name: "",
		},
	},
	{
		persist: ["sub"],
	}
);
```
Then, you can import and use it in your React client components.
```typescript app/page.tsx
"use client";
import { clearEstate, useEstate } from "../utils/estate";

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
      <button
        onClick={() => {
          clearEstate("main");
        }}
      >
       Initialize main state
      </button>
    </>
  );
}
```
## Key Features
1. Easy Setup: You can set up global state management with minimal configuration. No need to wrap your entire project in a provider, and only one initialization function is required.
1. Minimal Boilerplate: With just two lines of code in each file, you can both retrieve and modify the state, reducing the amount of code you need to write.
1. Strong Typing: Benefit from full type inference for state retrieval and updates, ensuring a safe and straightforward development experience.

## Notes
When using persistence with Next.js, keep in mind that server-side rendering won't have access to the persisted data, so the initial values will be displayed for a moment after page load.

<!-- ## Documentation
For more details and code examples, please refer to the Github repository. -->
