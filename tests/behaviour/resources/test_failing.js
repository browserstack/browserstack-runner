QUnit.module('Odd Tests');

QUnit.test('isOdd()', function(assert) {
  assert.ok(isOdd(2), '2 is an odd number');
  assert.ok(isOdd(222), '222 is an odd number');
  assert.ok(!isOdd(133), '133 is not an odd number');
});

QUnit.test('isEven()', function(assert) {
  assert.ok(isEven(3), '2 is an odd number');
  assert.ok(isEven(221), '222 is an odd number');
  assert.ok(!isEven(132), '133 is not an odd number');
});
