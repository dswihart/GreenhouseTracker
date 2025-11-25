"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>("");
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    const scannerId = "barcode-scanner";

    const startScanner = async () => {
      try {
        scannerRef.current = new Html5Qrcode(scannerId);

        await scannerRef.current.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.777,
          },
          (decodedText) => {
            // Successfully scanned
            onScan(decodedText);
            stopScanner();
          },
          () => {
            // Scan error - ignore, keep scanning
          }
        );
        setIsStarting(false);
      } catch (err) {
        console.error("Scanner error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Could not access camera. Please check permissions."
        );
        setIsStarting(false);
      }
    };

    const stopScanner = async () => {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, [onScan]);

  const handleClose = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Scan Seed Packet Barcode</h2>
          <button
            onClick={handleClose}
            className="text-white text-3xl hover:text-slate-300 p-2"
            aria-label="Close scanner"
          >
            ✕
          </button>
        </div>

        {error ? (
          <div className="bg-red-600/20 border border-red-500 rounded-lg p-4 text-center">
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={handleClose}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div
              id="barcode-scanner"
              className="w-full rounded-lg overflow-hidden bg-slate-800"
              style={{ minHeight: "300px" }}
            />
            {isStarting && (
              <p className="text-center text-slate-400 mt-4">
                Starting camera...
              </p>
            )}
            <p className="text-center text-slate-400 mt-4 text-sm">
              Point camera at the barcode on your seed packet
            </p>
          </>
        )}
      </div>
    </div>
  );
}
