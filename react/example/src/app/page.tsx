"use client";
import { useEstate, setEstates } from "@/utils/estate";
import Image from "next/image";
import { ChildComponentA } from "./_components/ChildComponentA";
import { useEffect, useRef } from "react";
import { ChildComponentB } from "./_components/ChildComponentB";
export default function Home() {
	const count = useRef(0);
	count.current++;
	// const { session } = useEstate("main");
	// const [a,b] = useEstate("persist", 'main');

	const { test, setEstate, session } = useEstate("main");
	const { text } = useEstate("persist");

	useEffect(() => {
		// setEstate({ test: 1 }).persist({ text: 1 });
		const a = setEstates
			.main({ session: { id: "1", name: "foo" } })
			.main({ test: "hello" })
			.main({ test: "how are you" })
			.persist({});
	}, []);

	return (
		<div>
			<div>render count:{count.current}</div>
			<div>
				{test},{text}
			</div>
			<div>id:{session?.id}</div>
			<div>name:{session?.name}</div>
			<ChildComponentA />
			{session?.id && <ChildComponentB />}
		</div>
	);
}
