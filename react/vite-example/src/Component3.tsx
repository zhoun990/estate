import { useEffect, useRef, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { setEstates, useEstate } from "./estate";

function App() {
  const { setEstate, useSelector } = useEstate("persist");
  const objA = useSelector(
    "obj",
    (obj) => {
      return obj.a;
    },
    []
  );

  console.log("objA", objA);

  return (
    <>
      <div className="card">
        <button
          onClick={() => {
            setEstate({ count3: (count3) => count3 + 1 });
          }}
        >
          count3
        </button>

        <button
          onClick={() => {
            setEstate({ obj: (obj) => ({ ...obj, a: obj.a + 1 }) });
          }}
        >
          obj.a is {objA}
        </button>

        <button
          onClick={() => {
            setEstate({ obj: (obj) => ({ ...obj, b: obj.b + 1 }) });
          }}
        >
          obj.b
        </button>

        <button
          onClick={() => {
            setEstate({ obj: (obj) => ({ ...obj, c: obj.c + 1 }) });
          }}
        >
          obj.c
        </button>

        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
