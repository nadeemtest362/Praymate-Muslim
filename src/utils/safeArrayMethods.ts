/**
 * Production-safe array method replacements
 * 
 * These utilities provide safe alternatives to array methods that break
 * in React Native 0.79.3 production builds due to minification issues.
 * 
 * Based on postmortem findings from POSTMORTEM_PRODUCTION_CRASH.md
 */

/**
 * Safe replacement for array.filter(Boolean)
 * Filters out null, undefined, and falsy values
 */
export function safeFilterBoolean<T>(arr: T[]): NonNullable<T>[] {
  const result: NonNullable<T>[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (!!arr[i]) {
      result.push(arr[i] as NonNullable<T>);
    }
  }
  return result;
}

/**
 * Safe replacement for array.includes(value)
 * Checks if array contains a value
 */
export function safeIncludes<T>(arr: T[], value: T): boolean {
  return arr.indexOf(value) !== -1;
}

/**
 * Safe replacement for array.find(predicate)
 * Finds first element matching predicate
 */
export function safeFind<T>(arr: T[], predicate: (item: T, index: number, array: T[]) => boolean): T | undefined {
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i], i, arr)) {
      return arr[i];
    }
  }
  return undefined;
}

/**
 * Safe replacement for array.some(predicate)
 * Checks if any element matches predicate
 */
export function safeSome<T>(arr: T[], predicate: (item: T, index: number, array: T[]) => boolean): boolean {
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i], i, arr)) {
      return true;
    }
  }
  return false;
}

/**
 * Safe replacement for array.findIndex(predicate)
 * Finds index of first element matching predicate
 */
export function safeFindIndex<T>(arr: T[], predicate: (item: T, index: number, array: T[]) => boolean): number {
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i], i, arr)) {
      return i;
    }
  }
  return -1;
}

/**
 * Safe replacement for Array.from(new Set(array))
 * Returns array with unique values
 */
export function safeUniqueArray<T>(arr: T[]): T[] {
  const unique: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (unique.indexOf(arr[i]) === -1) {
      unique.push(arr[i]);
    }
  }
  return unique;
}

/**
 * Safe replacement for array.every(predicate)
 * Checks if all elements match predicate
 */
export function safeEvery<T>(arr: T[], predicate: (item: T, index: number, array: T[]) => boolean): boolean {
  for (let i = 0; i < arr.length; i++) {
    if (!predicate(arr[i], i, arr)) {
      return false;
    }
  }
  return true;
}

/**
 * Safe replacement for array.slice(start, end)
 * Returns shallow copy of portion of array
 */
export function safeSlice<T>(arr: T[], start?: number, end?: number): T[] {
  const result: T[] = [];
  const startIndex = start || 0;
  const endIndex = end !== undefined ? end : arr.length;
  
  for (let i = startIndex; i < endIndex && i < arr.length; i++) {
    if (i >= 0) {
      result.push(arr[i]);
    }
  }
  return result;
}

type SafeSettledResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: any };

/**
 * Safe replacement for Promise.allSettled()
 * Executes promises sequentially with error handling
 */
export async function safeAllSettled<T extends readonly Promise<any>[]>(
  promises: T
): Promise<{ [K in keyof T]: SafeSettledResult<Awaited<T[K]>> }> {
  const results: SafeSettledResult<unknown>[] = [];

  for (let i = 0; i < promises.length; i++) {
    try {
      const value = await promises[i];
      results.push({ status: 'fulfilled', value });
    } catch (reason) {
      results.push({ status: 'rejected', reason });
    }
  }

  return results as { [K in keyof T]: SafeSettledResult<Awaited<T[K]>> };
}

/**
 * Example usage:
 * 
 * // Instead of: array.filter(Boolean)
 * const filtered = safeFilterBoolean(array);
 * 
 * // Instead of: array.includes(value)
 * if (safeIncludes(array, value)) { ... }
 * 
 * // Instead of: array.find(x => x.id === id)
 * const item = safeFind(array, x => x.id === id);
 * 
 * // Instead of: Array.from(new Set(array))
 * const unique = safeUniqueArray(array);
 */