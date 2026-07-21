import test from 'ava';
import {evaluateArithmetic} from '../renderer/utils/arithmetic';

test('evaluates dimension arithmetic without executing code', t => {
  t.is(evaluateArithmetic('1920 / 2'), 960);
  t.is(evaluateArithmetic('(100 + 20) * 3'), 360);
  t.true(Number.isNaN(evaluateArithmetic('process.exit()')));
  t.true(Number.isNaN(evaluateArithmetic('1 / 0')));
});
