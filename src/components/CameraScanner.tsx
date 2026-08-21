'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

type Props = {
  onDetected: (value: string) => void;
  onError?: (err: Error) => void;
  facingMode?: 'environment' | 'user';
  externalStream?: MediaStream | null;
  mode?: 'single' | 'continuous';
  debounceMs?: number;
};

export default function CameraScanner({ onDetected, onError, facingMode = 'environment', externalStream = null, mode = 'single', debounceMs = 2000 }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let ownedStream: MediaStream | null = null;
    let rafId: number | null = null;
    let detector: any = null;
    let mounted = true;
    let lastDetected: { [v: string]: number } = {};

    async function startWithStream(stream: MediaStream) {
      try {
        if (!mounted) return;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        const hasBarcode = typeof (window as any).BarcodeDetector !== 'undefined';
        if (hasBarcode) {
          try {
            detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          } catch (e) {
            detector = null;
          }
        }

        setScanning(true);

        const scanFrame = async () => {
          try {
            const videoEl = videoRef.current!;
            if (!videoEl || videoEl.readyState < 2) {
              rafId = requestAnimationFrame(scanFrame);
              return;
            }

            const handleFound = (value: string) => {
              const now = Date.now();
              if (mode === 'continuous') {
                const prev = lastDetected[value] || 0;
                if (now - prev < (debounceMs || 2000)) return false;
                lastDetected[value] = now;
                onDetected(String(value));
                return true;
              }
              stop();
              onDetected(String(value));
              return true;
            };

            if (detector) {
              try {
                const results = await detector.detect(videoEl);
                if (results && results.length > 0) {
                  const v = results[0].rawValue || results[0].rawData || '';
                  if (v) {
                    if (handleFound(String(v))) return;
                  }
                }
              } catch (e) {
                // continue to fallback
              }
            }

            try {
              const canvas = canvasRef.current!;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                canvas.width = videoEl.videoWidth || 640;
                canvas.height = videoEl.videoHeight || 480;
                ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                try {
                  const code = jsQR(imageData.data, imageData.width, imageData.height);
                  if (code && (code.data || code.data === '')) {
                    if (handleFound(String(code.data))) return;
                  }
                } catch (e) {
                  // jsQR failed — ignore
                }
              }
            } catch (e) {
              // ignore
            }

            rafId = requestAnimationFrame(scanFrame);
          } catch (err: any) {
            stop();
            if (onError) onError(err);
          }
        };

        rafId = requestAnimationFrame(scanFrame);
      } catch (err: any) {
        if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
          setPermissionDenied(true);
        }
        setSupported(false);
        if (onError) onError(err);
      }
    }

    async function start() {
      try {
        if (externalStream) {
          await startWithStream(externalStream);
          return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setSupported(false);
          if (onError) onError(new Error('Camera is not available. Open this page on HTTPS and allow camera access.'));
          return;
        }

        ownedStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        if (!mounted) return;
        setPermissionDenied(false);
        await startWithStream(ownedStream);
      } catch (err: any) {
        if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
          setPermissionDenied(true);
        }
        setSupported(false);
        if (onError) onError(err);
      }
    }

    function stop() {
      setScanning(false);
      try {
        if (rafId) cancelAnimationFrame(rafId);
      } catch {}
      try {
        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.pause();
          videoEl.srcObject = null;
        }
      } catch {}
      try {
        if (ownedStream) {
          ownedStream.getTracks().forEach((t) => t.stop());
        }
      } catch {}
    }

    start();

    return () => {
      mounted = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalStream, facingMode, mode, debounceMs]);

  if (!supported) {
    return (
      <div className="p-4 text-sm text-slate-600">
        Camera scanning is not supported in this browser. Please use your phone camera to open the QR link or enable camera permissions.
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div className="p-4 text-sm text-slate-600">
        Camera permission was denied. Please enable camera access for this site in your browser settings.
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-full h-auto rounded-2xl bg-slate-900"
        style={{ maxHeight: 420 }}
        playsInline
        muted
        autoPlay
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {!scanning && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">Starting camera…</div>}
    </div>
  );
}
