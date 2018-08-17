QUnit.module('Partial Tests', function() {
  QUnit.test('console Tests', function(assert) {
    // console functions should exist
    assert.ok(typeof console.info === 'function', 'console.info exists');
    assert.ok(typeof console.warn === 'function', 'console.warn exists');
    assert.ok(typeof console.log === 'function', 'console.log exists');
    assert.ok(typeof console.error === 'function', 'console.error exists');
    assert.ok(typeof console.debug === 'function', 'console.debug exists');
  });

  QUnit.test('Partial Tests', function(assert) {
    // Fails
    assert.ok(isOdd(2), '2 is an odd number');
    assert.ok(isEven(5), '5 is an even number');

    // Passes
    assert.ok(isOdd(3), '3 is an odd number');
    assert.ok(!isOdd(4), '4 is not an odd number');
    assert.ok(isEven(6), '6 is an even number');
    assert.ok(!isEven(7), '7 is not an even number');
  });
});
