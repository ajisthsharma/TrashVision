/**
 * Generates crisp, high-contrast synthetic waste scene images on an HTML5 Canvas
 * so that preset scenarios and simulated camera captures produce real base64 PNG
 * images aligned with bounding box coordinates.
 */

export function generatePresetSceneDataUrl(presetId: string): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Studio dark slate tabletop background with subtle grid
  const grad = ctx.createRadialGradient(480, 320, 80, 480, 320, 620);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(1, '#090d16');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 960, 640);

  // Subtle calibration grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 960; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 640);
    ctx.stroke();
  }
  for (let y = 0; y < 640; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(960, y);
    ctx.stroke();
  }

  if (presetId === 'mixed_kitchen_takeaway') {
    // Item 1: Clear PET Bottle (x: 8..34%, y: 14..82%)
    ctx.save();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(115, 135, 145, 360, 28);
    ctx.fill();
    ctx.stroke();
    // Bottle neck & blue cap
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(158, 92, 60, 36, 8);
    ctx.fill();
    // Liquid inside bottle
    ctx.fillStyle = 'rgba(250, 204, 21, 0.32)';
    ctx.beginPath();
    ctx.roundRect(119, 310, 137, 180, [0, 0, 24, 24]);
    ctx.fill();
    ctx.fillStyle = '#bae6fd';
    ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('PET #1 WATER', 135, 250);
    ctx.font = '400 12px "JetBrains Mono", monospace';
    ctx.fillText('500mL (Half-Full)', 130, 272);
    ctx.restore();

    // Item 2: Organic Banana Peels (x: 38..63%, y: 42..84%)
    ctx.save();
    ctx.strokeStyle = '#eab308';
    ctx.fillStyle = 'rgba(234, 179, 8, 0.28)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(475, 410, 95, 52, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(495, 455, 88, 44, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ORGANIC PEELS', 415, 415);
    ctx.restore();

    // Item 3: Grease-Soaked Cardboard Box (x: 66..94%, y: 18..82%)
    ctx.save();
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(645, 130, 245, 370, 14);
    ctx.fill();
    ctx.stroke();
    // Dark grease stain patch
    ctx.fillStyle = 'rgba(69, 26, 3, 0.78)';
    ctx.beginPath();
    ctx.arc(765, 330, 78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('CORRUGATED BOX', 692, 205);
    ctx.fillStyle = '#fca5a5';
    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillText('HEAVY OIL STAIN', 705, 335);
    ctx.restore();
  } else if (presetId === 'hazardous_ewaste_bench') {
    // Item 1: Swollen Li-Ion Battery (x: 10..35%, y: 24..72%)
    ctx.save();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(110, 165, 210, 285, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fecaca';
    ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Li-Ion 3.7V Pack', 145, 275);
    ctx.fillStyle = '#f87171';
    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillText('CAUTION: SWOLLEN CELL', 130, 305);
    ctx.restore();

    // Item 2: Shattered Glass Medicine Vial (x: 40..64%, y: 30..76%)
    ctx.save();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(410, 210);
    ctx.lineTo(565, 210);
    ctx.lineTo(590, 390);
    ctx.lineTo(510, 465);
    ctx.lineTo(400, 420);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('BROKEN GLASS VIAL', 420, 325);
    ctx.font = '400 12px "JetBrains Mono", monospace';
    ctx.fillText('SHARP + RX RESIDUE', 428, 350);
    ctx.restore();

    // Item 3: Frayed USB Cable (x: 68..92%, y: 20..80%)
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(710, 160);
    ctx.bezierCurveTo(860, 220, 670, 380, 830, 470);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('USB E-WASTE CORD', 695, 145);
    ctx.restore();
  } else if (presetId === 'ambiguous_cup_and_snack') {
    // Item 1: Unlabeled Clear Cup (x: 14..46%, y: 16..82%)
    ctx.save();
    ctx.fillStyle = 'rgba(226, 232, 240, 0.14)';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(165, 130);
    ctx.lineTo(405, 130);
    ctx.lineTo(365, 495);
    ctx.lineTo(205, 495);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('CLEAR CUP (NO VISIBLE LOGO)', 170, 290);
    ctx.fillStyle = '#fcd34d';
    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillText('PET #1 OR COMPOSTABLE PLA?', 180, 320);
    ctx.restore();

    // Item 2: Metallized MLP Snack Wrapper (x: 54..88%, y: 24..78%)
    ctx.save();
    ctx.fillStyle = 'rgba(14, 165, 233, 0.2)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(535, 165, 300, 325, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e0f2fe';
    ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('FOIL SNACK POUCH (MLP)', 575, 315);
    ctx.font = '400 13px "JetBrains Mono", monospace';
    ctx.fillText('Laminated Aluminum + PE Film', 575, 345);
    ctx.restore();
  } else {
    // Sanitary & Pharma preset
    ctx.save();
    ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(115, 160, 315, 315, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe4e6';
    ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('USED 3-PLY SURGICAL MASK', 155, 305);
    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillText('BIO-MEDICAL / SANITARY STREAM', 155, 335);

    ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
    ctx.strokeStyle = '#fbbf24';
    ctx.beginPath();
    ctx.roundRect(530, 180, 305, 290, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('EXPIRED TABLET BLISTER', 575, 310);
    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillText('PVC + ALUMINUM + API TABLETS', 565, 340);
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}
