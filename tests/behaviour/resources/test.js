QUnit.module('Odd Tests');

QUnit.test('isOdd()', function(assert) {
  assert.ok(isOdd(1), 'One is an odd number');
  assert.ok(isOdd(3), 'Three is an odd number');
  assert.ok(!isOdd(0), 'Zero is not odd number');
});
