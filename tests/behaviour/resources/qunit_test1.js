QUnit.module('Partial Tests', function() {
  QUnit.test('Partial Tests', function(assert) {
    // Fails
    assert.ok(isOdd(2), '2 is an odd number');
    assert.ok(isEven(5), '5 is an even number');

    // Passes
    assert.ok(isOdd(3), '3 is an odd number');
    assert.ok(!isOdd(4), '4 is not odd number');
    assert.ok(isEven(6), '6 is an even number');
    assert.ok(!isEven(7), '7 is not an even number');
  });
});
