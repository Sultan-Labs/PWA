export const vibrate = (pattern: number | number[] = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const hapticFeedback = {
  soft: () => vibrate(10),
  medium: () => vibrate(20),
  hard: () => vibrate([10, 30, 10]),
  success: () => vibrate([10, 30, 10, 30]),
  error: () => vibrate([50, 30, 50, 30, 50]),
};
