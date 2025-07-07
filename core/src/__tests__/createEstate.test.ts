import { createEstate } from '../functions/createEstate';
import { GlobalStore } from '../functions/GlobalStore';

describe('createEstate', () => {
  beforeEach(() => {
    // Reset the singleton instance before each test
    (GlobalStore as any).instance = undefined;
    // Reset localStorage mock
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should create estate with initial state', () => {
      const initialState = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'light' }
      };
      const estate = createEstate(initialState);
      
      expect(estate.store.get('user')?.get('name')).toBe('John');
      expect(estate.store.get('user')?.get('age')).toBe(30);
      expect(estate.store.get('settings')?.get('theme')).toBe('light');
    });

    it('should return setter functions', () => {
      const initialState = {
        user: { name: 'John', age: 30 }
      };
      const estate = createEstate(initialState);
      
      expect(estate.set).toBeDefined();
      expect(typeof estate.set.user).toBe('function');
    });

    it('should return subscribe function', () => {
      const initialState = {
        user: { name: 'John', age: 30 }
      };
      const estate = createEstate(initialState);
      
      expect(estate.subscribe).toBeDefined();
      expect(typeof estate.subscribe).toBe('function');
    });

    it('should return clearEstate function', () => {
      const initialState = {
        user: { name: 'John', age: 30 }
      };
      const estate = createEstate(initialState);
      
      expect(estate.clearEstate).toBeDefined();
      expect(typeof estate.clearEstate).toBe('function');
    });
  });

  describe('persistence', () => {
    it('should use localStorage when persist option is provided', () => {
      const initialState = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'light' }
      };
      
      createEstate(initialState, {
        persist: ['user']
      });
      
      // Should call getItem to attempt to restore persisted data
      expect((global as any).localStorageMock.getItem).toHaveBeenCalled();
      // The implementation attempts to restore persisted data for the user slice
      expect((global as any).localStorageMock.getItem).toHaveBeenCalledWith('name');
    });

    it('should restore data from localStorage', async () => {
      (global as any).localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'name') return JSON.stringify('Jane');
        if (key === 'age') return JSON.stringify(25);
        return null;
      });

      const initialState = {
        user: { name: 'John', age: 30 }
      };
      
      const estate = createEstate(initialState, {
        persist: ['user']
      });
      
      // Wait for async restoration
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(estate.store.get('user')?.get('name')).toBe('Jane');
      expect(estate.store.get('user')?.get('age')).toBe(25);
    });

    it('should save data to localStorage on updates', async () => {
      const initialState = {
        user: { name: 'John', age: 30 }
      };
      
      const estate = createEstate(initialState, {
        persist: ['user']
      });
      
      // Wait for persistence restoration to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Track initial setItem calls after restoration
      const initialCallCount = (global as any).localStorageMock.setItem.mock.calls.length;
      
      estate.set.user({ name: 'Jane' });
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // First verify the value was actually updated in the store
      expect(estate.store.get('user')?.get('name')).toBe('Jane');
      
      // Then check that localStorage setItem was called after the update
      const finalCallCount = (global as any).localStorageMock.setItem.mock.calls.length;
      expect(finalCallCount).toBeGreaterThan(initialCallCount);
      expect((global as any).localStorageMock.setItem).toHaveBeenCalledWith('name', expect.any(String));
    });

    it('should use custom storage when provided', () => {
      const customStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
      };
      
      const initialState = {
        user: { name: 'John', age: 30 }
      };
      
      createEstate(initialState, {
        persist: ['user'],
        storage: customStorage
      });
      
      expect(customStorage.getItem).toHaveBeenCalled();
      expect(customStorage.getItem).toHaveBeenCalledWith('name');
    });

    it('should handle async storage', async () => {
      const asyncStorage = {
        getItem: jest.fn().mockResolvedValue(JSON.stringify('Jane')),
        setItem: jest.fn().mockResolvedValue(undefined),
      };
      
      const initialState = {
        user: { name: 'John', age: 30 }
      };
      
      const estate = createEstate(initialState, {
        persist: ['user'],
        storage: asyncStorage
      });
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(estate.store.get('user')?.get('name')).toBe('Jane');
    });
  });

  describe('middleware', () => {
    it('should set middlewares when provided', async () => {
      const middleware = jest.fn(({ value }) => value.toUpperCase());
      const initialState = {
        user: { name: 'John', age: 30 }
      };
      
      const estate = createEstate(initialState, {
        middlewares: {
          user: {
            name: middleware
          }
        }
      });
      
      estate.set.user({ name: 'jane' });
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(middleware).toHaveBeenCalled();
    });
  });

  describe('debug mode', () => {
    it('should enable debug mode when debag option is true', () => {
      const initialState = {
        user: { name: 'John', age: 30 }
      };
      
      createEstate(initialState, {
        debag: true
      });
      
      // Debug mode should be enabled in settings
      const { settings } = require('../functions/GlobalStore');
      expect(settings.debag).toBe(true);
    });

    it('should disable debug mode when debag option is false', () => {
      const initialState = {
        user: { name: 'John', age: 30 }
      };
      
      createEstate(initialState, {
        debag: false
      });
      
      const { settings } = require('../functions/GlobalStore');
      expect(settings.debag).toBe(false);
    });
  });

  describe('subscriptions', () => {
    it('should subscribe to value changes', async () => {
      const initialState = {
        user: { name: 'John', age: 30 }
      };
      
      const estate = createEstate(initialState);
      const callback = jest.fn();
      
      estate.subscribe('user', 'name', 'test-listener', callback);
      estate.set.user({ name: 'Jane' });
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(callback).toHaveBeenCalledWith({
        slice: 'user',
        key: 'name',
        updateId: expect.any(String)
      });
    });

    it('should unsubscribe from value changes', async () => {
      const initialState = {
        user: { name: 'John', age: 30 }
      };
      
      const estate = createEstate(initialState);
      const callback = jest.fn();
      
      const unsubscribe = estate.subscribe('user', 'name', 'test-listener', callback);
      unsubscribe();
      
      estate.set.user({ name: 'Jane' });
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle compare function', async () => {
      const initialState = {
        user: { name: 'John', age: 30 }
      };
      
      const estate = createEstate(initialState);
      const callback = jest.fn();
      const compare = jest.fn().mockReturnValue(true); // same value
      
      estate.subscribe('user', 'name', 'test-listener', callback, compare);
      estate.set.user({ name: 'Jane' });
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(compare).toHaveBeenCalledWith('John', 'Jane');
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle once subscription', async () => {
      const initialState = {
        user: { name: 'John', age: 30 }
      };
      
      const estate = createEstate(initialState);
      const callback = jest.fn();
      
      estate.subscribe('user', 'name', 'test-listener', callback, undefined, true);
      estate.set.user({ name: 'Jane' });
      await new Promise(resolve => setTimeout(resolve, 0));
      
      estate.set.user({ name: 'Bob' });
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearEstate', () => {
    it('should clear specific slice', async () => {
      const initialState = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'light' }
      };
      
      const estate = createEstate(initialState);
      
      // Update values first
      estate.set.user({ name: 'Jane' });
      estate.set.settings({ theme: 'dark' });
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Clear specific slice
      estate.clearEstate('user');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(estate.store.get('user')?.get('name')).toBe('John');
      expect(estate.store.get('user')?.get('age')).toBe(30);
      expect(estate.store.get('settings')?.get('theme')).toBe('dark'); // unchanged
    });

    it('should clear all slices when no slice specified', async () => {
      const initialState = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'light' }
      };
      
      const estate = createEstate(initialState);
      
      // Update values first
      estate.set.user({ name: 'Jane' });
      estate.set.settings({ theme: 'dark' });
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Clear all slices
      estate.clearEstate();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(estate.store.get('user')?.get('name')).toBe('John');
      expect(estate.store.get('user')?.get('age')).toBe(30);
      expect(estate.store.get('settings')?.get('theme')).toBe('light');
    });
  });

  describe('complex data types', () => {
    it('should handle Map and Set in persistence', async () => {
      const initialState = {
        data: {
          map: new Map([['key1', 'value1']]),
          set: new Set([1, 2, 3])
        }
      };
      
      (global as any).localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'map') {
          return JSON.stringify({
            dataType: 'Map',
            value: [['key2', 'value2']]
          });
        }
        if (key === 'set') {
          return JSON.stringify({
            dataType: 'Set',
            value: [4, 5, 6]
          });
        }
        return null;
      });
      
      const estate = createEstate(initialState, {
        persist: ['data']
      });
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const restoredMap = estate.store.get('data')?.get('map');
      const restoredSet = estate.store.get('data')?.get('set');
      
      expect(restoredMap).toBeInstanceOf(Map);
      expect(restoredMap.get('key2')).toBe('value2');
      expect(restoredSet).toBeInstanceOf(Set);
      expect(restoredSet.has(4)).toBe(true);
      expect(restoredSet.has(5)).toBe(true);
      expect(restoredSet.has(6)).toBe(true);
    });
  });
});