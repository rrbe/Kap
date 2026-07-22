import {windowManager} from './windows/manager';
import {setRecordingTray, setPausedTray, disableTray, resetTray} from './tray';
import {setCropperShortcutAction} from './global-accelerators';
import {settings} from './common/settings';
import {getAudioDevices, getSelectedInputDeviceId} from './utils/devices';
import {showError} from './utils/errors';
import {setCurrentRecording, stopCurrentRecording} from './recording-history';
import {Recording} from './video';
import {ApertureOptions, StartRecordingOptions} from './common/types';
import {getCurrentDurationStart, getOverallDuration, setCurrentDurationStart, setOverallDuration} from './utils/track-duration';
import {screenRecorder} from './utils/screen-recorder';

let apertureOptions: ApertureOptions;
let past: number | undefined;

const cleanup = () => {
  windowManager.cropper?.close();
  resetTray();
  setCropperShortcutAction();
};

export const startRecording = async (options: StartRecordingOptions) => {
  if (past) {
    return;
  }

  past = Date.now();

  windowManager.preferences?.close();
  windowManager.cropper?.disable();
  disableTray();

  const {cropperBounds, displayId} = options;

  const {
    record60fps,
    showCursor,
    highlightClicks,
    recordAudio,
    recordSystemAudio
  } = settings.store;

  apertureOptions = {
    fps: record60fps ? 60 : 30,
    cropArea: cropperBounds,
    showCursor,
    highlightClicks,
    screenId: displayId,
    recordSystemAudio
  };

  if (recordAudio) {
    // In case for some reason the default audio device is not set
    // use the first available device for recording
    const audioInputDeviceId = getSelectedInputDeviceId();
    if (audioInputDeviceId) {
      apertureOptions.audioDeviceId = audioInputDeviceId;
    } else {
      const [defaultAudioDevice] = await getAudioDevices();
      apertureOptions.audioDeviceId = defaultAudioDevice?.id;
    }
  }

  // TODO: figure out how to correctly process hevc videos with ffmpeg
  // if (recordHevc) {
  //   apertureOptions.videoCodec = 'hevc';
  // }

  console.log(`Collected settings after ${(Date.now() - past) / 1000}s`);

  try {
    const filePath = await screenRecorder.startRecording(apertureOptions);
    setOverallDuration(0);
    setCurrentDurationStart(Date.now());

    setCurrentRecording({
      filePath,
      apertureOptions
    });
  } catch (error) {
    showError(error as any, {title: 'Recording error'});
    past = undefined;
    cleanup();
    return;
  }

  const startTime = (Date.now() - past) / 1000;
  console.log(`Started recording after ${startTime}s`);
  windowManager.cropper?.setRecording();
  setRecordingTray();
  setCropperShortcutAction(stopRecording);
  past = Date.now();

  // Watch native capture errors after recording has started, to avoid Kap freezing if something goes wrong
  screenRecorder.completion?.catch((error: any) => {
    // Make sure it doesn't catch the error of ending the recording
    if (past) {
      showError(error, {title: 'Recording error'});
      past = undefined;
      cleanup();
    }
  });
};

export const stopRecording = async () => {
  // Ensure we only stop recording once
  if (!past) {
    return;
  }

  console.log(`Stopped recording after ${(Date.now() - past) / 1000}s`);
  past = undefined;

  let filePath;

  try {
    filePath = await screenRecorder.stopRecording();
    setOverallDuration(0);
    setCurrentDurationStart(0);
  } catch (error) {
    showError(error as any, {title: 'Recording error'});
    cleanup();
    return;
  }

  try {
    cleanup();
  } finally {
    const recording = new Recording({
      filePath,
      apertureOptions
    });
    await recording.openEditorWindow();

    stopCurrentRecording();
  }
};

export const stopRecordingWithNoEdit = async () => {
  // Ensure we only stop recording once
  if (!past) {
    return;
  }

  console.log(`Stopped recording after ${(Date.now() - past) / 1000}s`);
  past = undefined;

  try {
    await screenRecorder.stopRecording();
    setOverallDuration(0);
    setCurrentDurationStart(0);
  } catch (error) {
    showError(error as any, {title: 'Recording error'});
    cleanup();
    return;
  }

  try {
    cleanup();
  } finally {
    stopCurrentRecording();
  }
};

export const pauseRecording = async () => {
  // Ensure we only pause if there's a recording in progress and if it's currently not paused
  const isPaused = await screenRecorder.isPaused();
  if (!past || isPaused) {
    return;
  }

  try {
    await screenRecorder.pause();
    setOverallDuration(getOverallDuration() + (Date.now() - getCurrentDurationStart()));
    setCurrentDurationStart(0);
    setPausedTray();
    console.log(`Paused recording after ${(Date.now() - past) / 1000}s`);
  } catch (error) {
    showError(error as any, {title: 'Recording error'});
    cleanup();
  }
};

export const resumeRecording = async () => {
  // Ensure we only resume if there's a recording in progress and if it's currently paused
  const isPaused = await screenRecorder.isPaused();
  if (!past || !isPaused) {
    return;
  }

  try {
    await screenRecorder.resume();
    setCurrentDurationStart(Date.now());
    setRecordingTray();
    console.log(`Resume recording after ${(Date.now() - past) / 1000}s`);
  } catch (error) {
    showError(error as any, {title: 'Recording error'});
    cleanup();
  }
};
