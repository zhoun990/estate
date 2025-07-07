// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Set localStorage on global and window
global.localStorage = localStorageMock;
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Make the mock available globally for tests
global.localStorageMock = localStorageMock;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});