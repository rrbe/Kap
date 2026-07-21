import test from 'ava';
import {hasExportEdits} from '../main/common/export-edits';

const source = {width: 1920, height: 1080, fps: 60, duration: 30};
const unchanged = {width: 1920, height: 1080, fps: 60, startTime: 0, endTime: 30};

test('detects whether an export can use the unchanged-file fast path', t => {
  t.false(hasExportEdits(unchanged, source));

  for (const change of [
    {width: 1280},
    {height: 720},
    {fps: 30},
    {startTime: 1},
    {endTime: 29}
  ]) {
    t.true(hasExportEdits({...unchanged, ...change}, source));
  }
});
