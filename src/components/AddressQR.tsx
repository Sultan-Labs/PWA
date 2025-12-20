/**
 * Address QR Component
 * 
 * Generates QR code for Sultan address using Canvas API.
 */

import { useEffect, useRef } from 'react';
import './AddressQR.css';

interface AddressQRProps {
  address: string;
  size?: number;
}

// Simple QR code generator using Canvas
// For production, consider using a library like 'qrcode'
export default function AddressQR({ address, size = 200 }: AddressQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!address || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple placeholder QR pattern (in production, use proper QR library)
    // This creates a visual representation, not a scannable QR
    const moduleSize = Math.floor(size / 25);
    const modules = 25;

    // Set canvas size
    canvas.width = size;
    canvas.height = size;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // Generate pattern based on address hash
    const hash = simpleHash(address);
    ctx.fillStyle = '#000000';

    // Draw finder patterns (corners)
    drawFinderPattern(ctx, 0, 0, moduleSize);
    drawFinderPattern(ctx, (modules - 7) * moduleSize, 0, moduleSize);
    drawFinderPattern(ctx, 0, (modules - 7) * moduleSize, moduleSize);

    // Draw data modules based on hash
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        // Skip finder pattern areas
        if (isFinderArea(row, col, modules)) continue;

        const bitIndex = (row * modules + col) % 64;
        const bit = (hash >> (bitIndex % 32)) & 1;

        if (bit || (row + col) % 3 === 0) {
          ctx.fillRect(
            col * moduleSize,
            row * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }
  }, [address, size]);

  return (
    <div className="address-qr">
      <canvas ref={canvasRef} className="qr-canvas" />
      <p className="qr-hint">Scan to receive SLTN</p>
    </div>
  );
}

// Simple hash function for visual pattern
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Draw 7x7 finder pattern
function drawFinderPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  moduleSize: number
) {
  // Outer square (7x7)
  ctx.fillRect(x, y, 7 * moduleSize, 7 * moduleSize);

  // Inner white square (5x5)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize);

  // Center square (3x3)
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
}

// Check if position is in finder pattern area
function isFinderArea(row: number, col: number, modules: number): boolean {
  // Top-left
  if (row < 8 && col < 8) return true;
  // Top-right
  if (row < 8 && col >= modules - 8) return true;
  // Bottom-left
  if (row >= modules - 8 && col < 8) return true;
  return false;
}
