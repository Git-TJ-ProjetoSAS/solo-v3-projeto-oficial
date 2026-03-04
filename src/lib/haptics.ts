/**
 * Trigger haptic feedback (vibration) on supported devices.
 * Falls back silently on unsupported browsers/devices.
 */
export function triggerHaptic(duration: number = 10) {
  try {
    if (navigator?.vibrate) {
      navigator.vibrate(duration);
    }
  } catch {
    // Silently ignore on unsupported devices
  }
}
