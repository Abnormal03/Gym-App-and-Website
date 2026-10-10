import test from 'node:test';
import assert from 'node:assert/strict';

import money from '../utils/money.js';

const { toMoney } = money;

test('toMoney rounds half-cent values with half-up semantics across magnitudes', () => {
    const cases = [
        [10.005, 10.01],
        [10.075, 10.08],
        [123.455, 123.46],
        [9999999.995, 10000000.00],
        [-10.075, -10.08],
        [0.005, 0.01],
    ];

    for (const [input, expected] of cases) {
        assert.equal(toMoney(input), expected);
    }
});
