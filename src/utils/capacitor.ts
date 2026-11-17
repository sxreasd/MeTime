import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

export function isNativeCapacitor(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function initNativeEdgeToEdge(): Promise<void> {
  if (!isNativeCapacitor()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#00000000' });
    }
  } catch {
    // Safe fallback if running in browser or plugin unavailable
  }
}

export function registerNativeBackListener(onBack: () => void): () => void {
  if (!isNativeCapacitor()) return () => {};

  let active = true;
  let removeFn: (() => Promise<void>) | null = null;

  CapApp.addListener('backButton', () => {
    if (active) onBack();
  })
    .then((handle) => {
      if (!active) {
        handle.remove().catch(() => {});
      } else {
        removeFn = () => handle.remove();
      }
    })
    .catch(() => {});

  return () => {
    active = false;
    if (removeFn) {
      removeFn().catch(() => {});
    }
  };
}

export function exitNativeApp(): void {
  if (isNativeCapacitor()) {
    CapApp.exitApp().catch(() => {});
  }
}
