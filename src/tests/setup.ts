// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Silence console warnings during tests
// eslint-disable-next-line no-console
const originalWarn = console.warn;
beforeAll(() => {
  // eslint-disable-next-line no-console
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Animated: `useNativeDriver`')) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  // eslint-disable-next-line no-console
  console.warn = originalWarn;
});
