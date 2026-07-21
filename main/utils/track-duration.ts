// TODO: Read recording duration from the native capture helper instead of tracking wall time here.
let overallDuration = 0;
let currentDurationStart = 0;

export const getOverallDuration = (): number => overallDuration;

export const getCurrentDurationStart = (): number => currentDurationStart;

export const setOverallDuration = (duration: number): void => {
  overallDuration = duration;
};

export const setCurrentDurationStart = (duration: number): void => {
  currentDurationStart = duration;
};
