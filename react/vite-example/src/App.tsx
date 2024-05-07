import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { useEstate } from "./estate";
import Component1 from "./Component1";

function App() {
  console.log("^_^ ::: file: App.tsx:8 ::: count2:\n");
  const { count2 } = useEstate("persist");
  console.log("^_^ ::: file: App.tsx:88 ::: count2:\n",count2);

  return (
    <>
      <Component1 />
    </>
  );
}

export default App;
