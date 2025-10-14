import type {
  afterAll as jestAfterAll,
  afterEach as jestAfterEach,
  beforeAll as jestBeforeAll,
  beforeEach as jestBeforeEach,
  describe as jestDescribe,
  expect as jestExpect,
  it as jestIt,
  test as jestTest,
  jest as jestApi,
} from '@jest/globals';

type JestType = typeof jestApi;

type TimerKeys =
  | 'useFakeTimers'
  | 'useRealTimers'
  | 'advanceTimersByTime'
  | 'advanceTimersToNextTimer'
  | 'runAllTimers'
  | 'setSystemTime';

type MockControlKeys =
  | 'fn'
  | 'spyOn'
  | 'mock'
  | 'unmock'
  | 'doMock'
  | 'resetAllMocks'
  | 'restoreAllMocks'
  | 'clearAllMocks'
  | 'resetModules'
  | 'isolateModules';

export interface Vi extends Pick<JestType, TimerKeys | MockControlKeys> {
  getRealSystemTime(): number;
  restoreAllMocksIfPossible(): void;
  stubGlobal<T = unknown>(name: string, value: T): () => void;
}

export const vi: Vi;

export const afterAll: typeof jestAfterAll;
export const afterEach: typeof jestAfterEach;
export const beforeAll: typeof jestBeforeAll;
export const beforeEach: typeof jestBeforeEach;
export const describe: typeof jestDescribe;
export const expect: typeof jestExpect;
export const test: typeof jestTest;
export const it: typeof jestIt;
