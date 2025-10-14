const jestGlobals = require('@jest/globals');

const {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} = jestGlobals;

const jestApi = jestGlobals.jest;
const it = test;

const vi = {
  fn: (...args) => jestApi.fn(...args),
  spyOn: (...args) => jestApi.spyOn(...args),
  mock: (...args) => jestApi.mock(...args),
  unmock: (...args) => jestApi.unmock(...args),
  doMock: (...args) => jestApi.doMock(...args),
  resetAllMocks: () => jestApi.resetAllMocks(),
  restoreAllMocks: () => jestApi.restoreAllMocks(),
  clearAllMocks: () => jestApi.clearAllMocks(),
  useFakeTimers: (...args) => jestApi.useFakeTimers(...args),
  useRealTimers: (...args) => jestApi.useRealTimers(...args),
  advanceTimersByTime: (...args) => jestApi.advanceTimersByTime(...args),
  advanceTimersToNextTimer: (...args) => jestApi.advanceTimersToNextTimer(...args),
  runAllTimers: (...args) => jestApi.runAllTimers(...args),
  setSystemTime: (...args) => jestApi.setSystemTime(...args),
  getRealSystemTime: () => Date.now(),
  resetModules: () => jestApi.resetModules(),
  isolateModules: (...args) => jestApi.isolateModules(...args),
  restoreAllMocksIfPossible: () => {
    if (typeof jestApi.restoreAllMocks === 'function') {
      jestApi.restoreAllMocks();
    }
  },
};

vi.restoreAllMocks = vi.restoreAllMocks;
vi.clearAllMocks = vi.clearAllMocks;
vi.resetAllMocks = vi.resetAllMocks;
vi.useFakeTimers = vi.useFakeTimers;
vi.useRealTimers = vi.useRealTimers;
vi.resetModules = vi.resetModules;
vi.stubGlobal = (name, value) => {
  const original = global[name];
  global[name] = value;
  return () => {
    global[name] = original;
  };
};

module.exports = {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  test,
  vi,
};
