/**
 * Create a key checker function for `unknown` objects. Ensure that the list of
 * provided keys exists on an object.
 *
 * @param keys - List of object keys to check.
 *
 * @returns Object key checker function returning a boolean result based on the
 *          given key expectations.
 */
export function makeObjectKeyChecker(keys: string[]): (obj: AnyObject) => boolean {
  return (obj: AnyObject) => keys.every((key) => obj[key] !== undefined);
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type AnyObject = {
  [key: string]: any;
};
