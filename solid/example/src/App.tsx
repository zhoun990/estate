import { createSignal } from "solid-js";
import solidLogo from "./assets/solid.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { createEstate, setEstates } from "./estate";

function App() {
  const { count, setEstate } = createEstate("main");
  // const { page ,setEstate:setPersistEstate} = createEstate("persist");
  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} class="logo" alt="Vite logo" />
        </a>
        <a href="https://solidjs.com" target="_blank">
          <img src={solidLogo} class="logo solid" alt="Solid logo" />
        </a>
      </div>
      <h1>Vite + Solid</h1>
      <div class="card">
        <button
          onClick={() => {
            setEstate({ count: (count) => count + 1 });
            // setPersistEstate({ page: (page) => page + 1 });
            // setEstates.persist({ page: (page) => page + 1 });
          }}
        >
          count is {count()}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p class="read-the-docs">
        Click on the Vite and Solid logos to learn more
      </p>
    </>
  );
}

export default App;
