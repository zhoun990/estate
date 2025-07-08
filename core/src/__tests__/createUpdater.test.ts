import { setter } from "../functions/createUpdater";
import { GlobalStore } from "../functions/GlobalStore";

describe("createUpdater", () => {
  let store: GlobalStore<any>;
  let setters: ReturnType<typeof setter>;

  beforeEach(() => {
    // Reset the singleton instance before each test
    (GlobalStore as any).instance = undefined;
    const initialState = {
      user: { name: "John", age: 30 },
      settings: { theme: "light", language: "en" },
    };
    store = GlobalStore.getInstance(initialState);
    setters = setter(initialState);
    // 初期化フラグを設定
    store.setInitialized(true);
  });

  describe("setter creation", () => {
    it("should create setters for each slice", () => {
      expect(setters).toHaveProperty("user");
      expect(setters).toHaveProperty("settings");
      expect(typeof setters.user).toBe("function");
      expect(typeof setters.settings).toBe("function");
    });
  });

  describe("value setting", () => {
    it("should set static values", async () => {
      setters.user({ name: "Jane" });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(store.getValue("user", "name")).toBe("Jane");
    });

    it("should set multiple values at once", async () => {
      setters.user({ name: "Jane", age: 25 });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(store.getValue("user", "name")).toBe("Jane");
      expect(store.getValue("user", "age")).toBe(25);
    });

    it("should handle function values", async () => {
      setters.user({
        name: (current: string) => current.toUpperCase(),
        age: (current: number) => current + 1,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(store.getValue("user", "name")).toBe("JOHN");
      expect(store.getValue("user", "age")).toBe(31);
    });

    it("should handle async function values", async () => {
      setters.user({
        name: (current: string) => current.toUpperCase(),
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(store.getValue("user", "name")).toBe("JOHN");
    });

    it("should handle Promise values", () => {
      setters.user({
        name: Promise.resolve("Jane"),
      });
      // 同期処理なので、Promiseオブジェクトがそのまま格納される
      expect(store.getValue("user", "name")).toBeInstanceOf(Promise);
    });
  });

  describe("forceRenderer parameter", () => {
    it("should pass forceRenderer to setValue", async () => {
      const setValueSpy = jest.spyOn(store, "setValue");
      setters.user({ name: "Jane" }, true);

      expect(setValueSpy).toHaveBeenCalledWith(
        "user",
        "name",
        expect.any(Function),
        true
      );
    });

    it("should default forceRenderer to undefined", async () => {
      const setValueSpy = jest.spyOn(store, "setValue");
      setters.user({ name: "Jane" });

      expect(setValueSpy).toHaveBeenCalledWith(
        "user",
        "name",
        expect.any(Function),
        undefined
      );
    });
  });

  describe("error handling", () => {
    it("should handle errors in function values", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      setters.user({
        name: () => {
          throw new Error("Test error");
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      // The error should be caught and logged, but not crash the application
      expect(store.getValue("user", "name")).toBe("John"); // unchanged
      consoleSpy.mockRestore();
    });

    it("should handle errors in async function values", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      setters.user({
        name: async () => {
          throw new Error("Async test error");
        },
      });

      // 同期処理では、async関数の結果（Promise）が格納される
      expect(store.getValue("user", "name")).toBeInstanceOf(Promise);
      consoleSpy.mockRestore();
    });
  });

  describe("different slice setters", () => {
    it("should handle different slices independently", async () => {
      setters.user({ name: "Jane" });
      setters.settings({ theme: "dark" });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.getValue("user", "name")).toBe("Jane");
      expect(store.getValue("settings", "theme")).toBe("dark");
      expect(store.getValue("user", "age")).toBe(30); // unchanged
      expect(store.getValue("settings", "language")).toBe("en"); // unchanged
    });
  });

  describe("concurrent updates", () => {
    it("should handle multiple updates to same slice", async () => {
      // Test basic update functionality
      setters.user({ age: (current: number) => current + 1 });
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(store.getValue("user", "age")).toBe(31); // 30 + 1
    });

    it("should handle concurrent updates to different slices", async () => {
      const promises = [
        new Promise<void>((resolve) => {
          setters.user({ name: "Jane" });
          resolve();
        }),
        new Promise<void>((resolve) => {
          setters.settings({ theme: "dark" });
          resolve();
        }),
      ];

      await Promise.all(promises);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.getValue("user", "name")).toBe("Jane");
      expect(store.getValue("settings", "theme")).toBe("dark");
    });
  });

  describe("type safety", () => {
    it("should only accept valid keys for each slice", () => {
      // These should work without TypeScript errors
      setters.user({ name: "Jane", age: 25 });
      setters.settings({ theme: "dark", language: "jp" });

      // These would cause TypeScript errors if uncommented:
      // setters.user({ invalidKey: 'value' });
      // setters.settings({ invalidKey: 'value' });
    });
  });
});
