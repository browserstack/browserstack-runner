QUnit.module('All Pass/Fail tests', function() {
  QUnit.test('All Pass', function(assert) {
    assert.ok(isOdd(13), '13 is an odd number');
    assert.ok(isOdd(15), '15 is an odd number');
    assert.ok(!isOdd(12), '12 is not an odd number');
    assert.ok(isEven(14), '14 is an even number');
    assert.ok(isEven(16), '16 is an even number');
    assert.ok(!isEven(17), '17 is not an even number');
  });

  QUnit.test('All Fail', function(assert) {
    assert.ok(isOdd(22), '22 is an odd number');
    assert.ok(isOdd(24), '24 is an odd number');
    assert.ok(!isOdd(21), '21 is not an odd number');
    assert.ok(isEven(23), '23 is an even number');
    assert.ok(isEven(25), '25 is an even number');
    assert.ok(!isEven(26), '26 is not an even number');
  });
});
