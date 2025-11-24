// Polyfill for Set methods that might be missing in production builds
// This must be imported at the very top of the app

// Check if Set exists and has all required methods
if (typeof Set !== 'undefined') {
  // Polyfill Set.prototype.has if missing
  if (!Set.prototype.has) {
    console.warn('[SetPolyfill] Adding Set.prototype.has');
    // eslint-disable-next-line no-extend-native
    Set.prototype.has = function(value: any) {
      const values = Array.from(this);
      return values.indexOf(value) !== -1;
    };
  }
  
  // Polyfill Set.prototype.add if missing
  if (!Set.prototype.add) {
    console.warn('[SetPolyfill] Adding Set.prototype.add');
    // eslint-disable-next-line no-extend-native
    Set.prototype.add = function(value: any) {
      const values = Array.from(this);
      if (values.indexOf(value) === -1) {
        values.push(value);
        // Rebuild the Set
        this.clear();
        values.forEach(v => Set.prototype.add.call(this, v));
      }
      return this;
    };
  }
  
  // Ensure Array.from works with Sets
  const testSet = new Set([1, 2, 3]);
  try {
    const testArray = Array.from(testSet);
    if (!Array.isArray(testArray) || testArray.length !== 3) {
      console.warn('[SetPolyfill] Array.from(Set) not working properly');
    }
  } catch (e) {
    console.error('[SetPolyfill] Array.from(Set) failed:', e);
  }
} else {
  console.error('[SetPolyfill] Set is not defined!');
}

export {};