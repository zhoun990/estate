"use client";
import { useEstate } from "@/utils/estate";
import Image from "next/image";
import { ChildComponentA } from "./_components/ChildComponentA";
import { useRef } from "react";
import { ChildComponentB } from "./_components/ChildComponentB";
export default function Home() {
	const count = useRef(0);
	count.current++;
	const { session } = useEstate("main");
	return (
		<div>
			<div>render count:{count.current}</div>
			<div>id:{session?.id}</div>
			<div>name:{session?.name}</div>
			<ChildComponentA />
			<ChildComponentB />
		</div>
	);
}
