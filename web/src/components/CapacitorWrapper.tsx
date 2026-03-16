'use client';

import { useEffect, useRef, useState } from 'react';

const APP_VERSION = '1.0.0';
const VERSION_URL = 'https://lap-wa.vercel.app/app-version.json';

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

export default function CapacitorWrapper() {
  const [isOffline, setIsOffline] = useState(false);
  const [backOnline, setBackOnline] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<{ version: string; apk: string } | null>(null);
  const backPressedRef = useRef(false);

  useEffect(() => {
    let networkListener: (() => void) | null = null;
    let backListener: (() => void) | null = null;
    let splashHidden = false;

    async function init() {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      document.documentElement.classList.add('is-native');

      const platform = Capacitor.getPlatform();

      // --- Splash Screen ---
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        setTimeout(async () => {
          if (!splashHidden) {
            splashHidden = true;
            await SplashScreen.hide({ fadeOutDuration: 300 });
          }
        }, 2500);
      } catch {}

      // --- Network Detection ---
      try {
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        setIsOffline(!status.connected);

        const listener = await Network.addListener('networkStatusChange', (status) => {
          if (!status.connected) {
            setIsOffline(true);
            setBackOnline(false);
          } else {
            setIsOffline(false);
            setBackOnline(true);
            setTimeout(() => setBackOnline(false), 3000);
          }
        });
        networkListener = () => listener.remove();
      } catch {}

      // --- Android Back Button ---
      if (platform === 'android') {
        try {
          const { App } = await import('@capacitor/app');
          const listener = await App.addListener('backButton', async ({ canGoBack }) => {
            if (canGoBack) {
              window.history.back();
            } else {
              if (backPressedRef.current) {
                App.exitApp();
              } else {
                backPressedRef.current = true;
                const { Toast } = await import('@capacitor/toast');
                await Toast.show({ text: 'Tekan kembali lagi untuk keluar', duration: 'short' });
                setTimeout(() => { backPressedRef.current = false; }, 2000);
              }
            }
          });
          backListener = () => listener.remove();
        } catch {}
      }

      // --- External Links ---
      try {
        const { Browser } = await import('@capacitor/browser');
        const EXTERNAL_DOMAINS = ['youtube.com', 'wa.me', 'maps.google.com', 'google.com', 'facebook.com', 'instagram.com'];
        document.addEventListener('click', async (e) => {
          const target = (e.target as HTMLElement).closest('a');
          if (!target) return;
          const href = target.getAttribute('href') || '';
          if (href.startsWith('http') && EXTERNAL_DOMAINS.some(d => href.includes(d))) {
            e.preventDefault();
            await Browser.open({ url: href });
          }
        });
      } catch {}

      // --- Pull to Refresh ---
      let startY = 0;
      let pulling = false;
      document.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
      }, { passive: true });
      document.addEventListener('touchend', (e) => {
        const endY = e.changedTouches[0].clientY;
        const deltaY = endY - startY;
        if (deltaY > 120 && window.scrollY === 0 && !pulling) {
          pulling = true;
          window.location.reload();
        }
      }, { passive: true });

      // --- Update Detection ---
      try {
        const res = await fetch(VERSION_URL);
        const data = await res.json();
        if (data.version && compareVersions(data.version, APP_VERSION) > 0) {
          setUpdateAvailable({ version: data.version, apk: data.apk });
        }
      } catch {}
    }

    init();

    return () => {
      networkListener?.();
      backListener?.();
    };
  }, []);

  return (
    <>
      {/* Offline Banner */}
      {isOffline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#ef4444', color: 'white', padding: '10px 16px',
          textAlign: 'center', fontSize: '14px', fontWeight: 500
        }}>
          ⚠️ Tidak ada koneksi internet
        </div>
      )}

      {/* Back Online Banner */}
      {backOnline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#22c55e', color: 'white', padding: '10px 16px',
          textAlign: 'center', fontSize: '14px', fontWeight: 500
        }}>
          ✅ Koneksi kembali
        </div>
      )}

      {/* Update Banner */}
      {updateAvailable && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          background: '#1e40af', color: 'white', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '14px'
        }}>
          <span>🚀 Update tersedia v{updateAvailable.version}</span>
          <a
            href={updateAvailable.apk}
            style={{
              background: 'white', color: '#1e40af', padding: '6px 14px',
              borderRadius: '6px', fontWeight: 700, textDecoration: 'none', fontSize: '13px'
            }}
          >
            Update
          </a>
        </div>
      )}
    </>
  );
}
