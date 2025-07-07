import { GlobalStore } from "../functions/GlobalStore";

describe("GlobalStore", () => {
  let store: GlobalStore<any>;

  beforeEach(() => {
    // Reset the singleton instance before each test
    (GlobalStore as any).instance = undefined;
    store = GlobalStore.getInstance({
      user: { name: "John", age: 30 },
      settings: { theme: "light", language: "en" },
    });
  });

  describe("singleton pattern", () => {
    it("should return same instance when called multiple times", () => {
      (GlobalStore as any).instance = undefined;
      const store1 = GlobalStore.getInstance({ test: { value: 1 } });
      const store2 = GlobalStore.getInstance();
      expect(store1).toBe(store2);
    });

    it("should use initial state only on first call", () => {
      (GlobalStore as any).instance = undefined;
      const initialState = { test: { value: 1 } };
      const store1 = GlobalStore.getInstance(initialState);
      const store2 = GlobalStore.getInstance({ different: { value: 2 } });
      expect(store1.getStore()).toEqual(initialState);
      expect(store2.getStore()).toEqual(initialState);
    });
  });

  describe("store operations", () => {
    it("should get store as plain object", () => {
      const storeData = store.getStore();
      expect(storeData).toEqual({
        user: { name: "John", age: 30 },
        settings: { theme: "light", language: "en" },
      });
    });

    it("should get slice data", () => {
      const userSlice = store.getSlice("user");
      expect(userSlice).toEqual({ name: "John", age: 30 });
    });

    it("should get individual values", () => {
      expect(store.getValue("user", "name")).toBe("John");
      expect(store.getValue("user", "age")).toBe(30);
      expect(store.getValue("settings", "theme")).toBe("light");
    });

    it("should get cloned values", async () => {
      (GlobalStore as any).instance = undefined;
      const originalValue = { nested: { value: 123 } };
      const testStore = GlobalStore.getInstance({
        test: { data: originalValue },
      });
      const cloned = testStore.getClonedValue("test", "data");
      expect(cloned).toEqual(originalValue);
      expect(cloned).not.toBe(originalValue);
    });
  });

  describe("setSlice", () => {
    it("should update slice with new values", async () => {
      store.setSlice("user", { name: "Jane", age: 25 });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(store.getValue("user", "name")).toBe("Jane");
      expect(store.getValue("user", "age")).toBe(25);
    });

    it("should update partial slice", async () => {
      store.setSlice("user", { name: "Jane" });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(store.getValue("user", "name")).toBe("Jane");
      expect(store.getValue("user", "age")).toBe(30); // unchanged
    });
  });

  describe("setValue", () => {
    it("should update single value", async () => {
      store.setValue("user", "name", () => "Jane");
      // Wait for async update
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(store.getValue("user", "name")).toBe("Jane");
    });

    it("should handle value updates", async () => {
      store.setValue("user", "age", (current) => current + 1);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(store.getValue("user", "age")).toBe(31);
    });

    it("should throw error for non-existing slice", () => {
      expect(() => {
        store.setValue("nonexistent", "key", () => "value");
      }).toThrow("The slice does not exist in the store");
    });

    it("should throw error for non-existing key", () => {
      expect(() => {
        store.setValue("user", "nonexistent", () => "value");
      }).toThrow("The key does not exist in the slice");
    });
  });

  describe("subscriptions", () => {
    it("should subscribe to value changes", async () => {
      const callback = jest.fn();
      store.subscribe({
        slice: "user",
        key: "name",
        listenerId: "test-listener",
        callback,
      });

      store.setValue("user", "name", () => "Jane");
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(callback).toHaveBeenCalledWith({
        slice: "user",
        key: "name",
        updateId: expect.any(String),
      });
    });

    it("should unsubscribe from value changes", async () => {
      const callback = jest.fn();
      const unsubscribe = store.subscribe({
        slice: "user",
        key: "name",
        listenerId: "test-listener",
        callback,
      });

      unsubscribe();
      store.setValue("user", "name", () => "Jane");
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(callback).not.toHaveBeenCalled();
    });

    it("should subscribe with compare function", async () => {
      const callback = jest.fn();
      const compare = jest.fn().mockReturnValue(true); // same value

      store.subscribe({
        slice: "user",
        key: "name",
        listenerId: "test-listener",
        callback,
        compare,
      });

      store.setValue("user", "name", () => "Jane");
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(compare).toHaveBeenCalledWith("John", "Jane");
      expect(callback).not.toHaveBeenCalled(); // not called because compare returned true
    });

    it("should handle once subscription", async () => {
      const callback = jest.fn();
      store.subscribe({
        slice: "user",
        key: "name",
        listenerId: "test-listener",
        callback,
        once: true,
      });

      store.setValue("user", "name", () => "Jane");
      await new Promise((resolve) => setTimeout(resolve, 0));

      store.setValue("user", "name", () => "Bob");
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should subscribe to entire slice", async () => {
      const callback = jest.fn();
      store.subscribeSlice("user", "slice-listener", callback);

      store.setValue("user", "name", () => "Jane");
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(callback).toHaveBeenCalledWith({
        slice: "user",
        key: "name",
        updateId: expect.any(String),
      });
    });
  });

  describe("middleware", () => {
    it("should apply middleware to value updates", () => {
      const middleware = jest.fn(({ value }) => value.toUpperCase());
      store.setMiddleware("user", "name", middleware);

      store.setValue("user", "name", () => "jane");
      // 同期処理なので待機は不要

      expect(middleware).toHaveBeenCalledWith({
        value: "jane",
        slice: "user",
        key: "name",
        globalStore: {
          settings: { theme: "light", language: "en" },
          user: { name: "John", age: 30 },
        },
      });
      expect(store.getValue("user", "name")).toBe("JANE");
    });

    it("should apply multiple middlewares", async () => {
      const middlewares = {
        user: {
          name: ({ value }: { value: string }) => value.toUpperCase(),
          age: ({ value }: { value: number }) => value * 2,
        },
      };
      store.setMiddlewares(middlewares);

      store.setValue("user", "name", () => "jane");
      store.setValue("user", "age", () => 25);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.getValue("user", "name")).toBe("JANE");
      expect(store.getValue("user", "age")).toBe(50);
    });

    it("should handle middleware returning non-function values", async () => {
      store.setMiddleware("user", "name", "static-value" as any);

      store.setValue("user", "name", () => "jane");
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.getValue("user", "name")).toBe("static-value");
    });
  });

  describe("concurrent updates", () => {
    it("should handle updates properly", async () => {
      // Test basic update functionality
      store.setValue("user", "age", (current) => current + 1);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(store.getValue("user", "age")).toBe(31); // 30 + 1
    });
  });
});
