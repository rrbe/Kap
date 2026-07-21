import test from 'ava';

import {parseCaptureMessage, ScreenRecorder} from '../main/utils/screen-recorder';

test('parses capture helper events', t => {
  t.deepEqual(
    parseCaptureMessage('{"event":"pausedState","value":true}'),
    {event: 'pausedState', value: true}
  );
});

test('rejects capture helper messages without an event', t => {
  t.throws(
    () => parseCaptureMessage('{"message":"broken"}'),
    {message: 'Capture helper returned an invalid event'}
  );
});

test('surfaces capture helper launch failures', async t => {
  const recorder = new ScreenRecorder('/missing/kap-capture');

  await t.throwsAsync(
    recorder.startRecording({
      fps: 30,
      cropArea: {x: 0, y: 0, width: 640, height: 360},
      showCursor: true,
      highlightClicks: false,
      screenId: 1,
      recordSystemAudio: false
    }),
    {message: /spawn.*ENOENT/}
  );
});
