import { useEffect, useRef, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { setEstates, useEstate } from "./estate";

function App() {
  const { count3, setEstate } = useEstate("persist");
  console.log("count3", count3);

  return (
    <>
      <div className="card">
        <button
          onClick={() => {
            setEstate({ count3: (count3) => count3 + 1 });
          }}
        >
          count3 is {count3}
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
