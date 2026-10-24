import React, { useEffect, useRef } from 'react';

interface AiSphereBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  depth: number; // 0.4 (far) to 1.0 (near)
  phase: number;
  pulseSpeed: number;
  variant: 'emerald' | 'forest' | 'jade';
}

interface ClickWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export function InteractiveEcoBackground({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -1000,
    y: -1000,
    active: false,
  });
  const wavesRef = useRef<ClickWave[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      pointerRef.current.x = e.clientX;
      pointerRef.current.y = e.clientY;
      pointerRef.current.active = true;
    };

    const handleMouseLeave = () => {
      pointerRef.current.active = false;
    };

    const handleClick = (e: MouseEvent) => {
      wavesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        radius: 14,
        maxRadius: 180,
        alpha: isDark ? 0.32 : 0.22,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleClick, { passive: true });

    // Create 3D volumetric AI sphere bubbles matching the reference screenshot:
    // A mix of large ambient 3D spheres and medium interactive floating orbs
    const count = Math.min(18, Math.max(10, Math.floor((width * height) / 85000)));
    const variants: AiSphereBubble['variant'][] = ['emerald', 'forest', 'jade'];

    const spheres: AiSphereBubble[] = Array.from({ length: count }, (_, idx) => {
      // First 5 are large architectural 3D spheres like in image_a63d7870.png
      const isHeroOrb = idx < 5;
      const baseRadius = isHeroOrb
        ? 55 + (idx % 3) * 32 + Math.random() * 25
        : 22 + Math.random() * 34;
      const depth = isHeroOrb ? 0.85 + Math.random() * 0.15 : 0.45 + Math.random() * 0.45;

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35 * depth,
        vy: (-0.18 - Math.random() * 0.28) * depth,
        radius: baseRadius,
        baseRadius,
        depth,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.012 + Math.random() * 0.012,
        variant: variants[idx % variants.length],
      };
    });

    const draw3DSphere = (s: AiSphereBubble, dark: boolean) => {
      const r = s.radius;
      const x = s.x;
      const y = s.y;

      ctx.save();

      // 1. Soft ambient drop shadow behind the 3D sphere for depth separation
      const shadowGrad = ctx.createRadialGradient(
        x + r * 0.18,
        y + r * 0.24,
        r * 0.1,
        x + r * 0.12,
        y + r * 0.18,
        r * 1.35
      );
      if (dark) {
        shadowGrad.addColorStop(0, `rgba(2, 8, 5, ${0.55 * s.depth})`);
        shadowGrad.addColorStop(1, 'rgba(2, 8, 5, 0)');
      } else {
        shadowGrad.addColorStop(0, `rgba(20, 52, 32, ${0.12 * s.depth})`);
        shadowGrad.addColorStop(1, 'rgba(20, 52, 32, 0)');
      }
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.arc(x + r * 0.12, y + r * 0.18, r * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // 2. Main 3D spherical body gradient (top-left light source -> deep core shadow)
      const lightX = x - r * 0.34;
      const lightY = y - r * 0.34;
      const sphereGrad = ctx.createRadialGradient(lightX, lightY, r * 0.04, x, y, r);

      if (dark) {
        // Matches the smooth dark-emerald 3D spheres in image_a63d7870.png
        if (s.variant === 'emerald') {
          sphereGrad.addColorStop(0, `rgba(74, 168, 108, ${0.42 * s.depth})`);
          sphereGrad.addColorStop(0.28, `rgba(38, 98, 60, ${0.48 * s.depth})`);
          sphereGrad.addColorStop(0.7, `rgba(14, 38, 23, ${0.62 * s.depth})`);
          sphereGrad.addColorStop(1, `rgba(7, 19, 12, ${0.72 * s.depth})`);
        } else if (s.variant === 'forest') {
          sphereGrad.addColorStop(0, `rgba(62, 148, 92, ${0.38 * s.depth})`);
          sphereGrad.addColorStop(0.32, `rgba(28, 78, 48, ${0.46 * s.depth})`);
          sphereGrad.addColorStop(0.72, `rgba(11, 31, 19, ${0.6 * s.depth})`);
          sphereGrad.addColorStop(1, `rgba(6, 16, 10, ${0.7 * s.depth})`);
        } else {
          sphereGrad.addColorStop(0, `rgba(82, 178, 124, ${0.36 * s.depth})`);
          sphereGrad.addColorStop(0.3, `rgba(34, 92, 62, ${0.44 * s.depth})`);
          sphereGrad.addColorStop(0.72, `rgba(12, 35, 24, ${0.58 * s.depth})`);
          sphereGrad.addColorStop(1, `rgba(6, 18, 12, ${0.68 * s.depth})`);
        }
      } else {
        // Calm, tactile 3D sage spheres for Light Mode
        if (s.variant === 'emerald') {
          sphereGrad.addColorStop(0, `rgba(235, 247, 238, ${0.75 * s.depth})`);
          sphereGrad.addColorStop(0.35, `rgba(168, 212, 180, ${0.38 * s.depth})`);
          sphereGrad.addColorStop(0.78, `rgba(98, 158, 116, ${0.26 * s.depth})`);
          sphereGrad.addColorStop(1, `rgba(64, 122, 84, ${0.22 * s.depth})`);
        } else {
          sphereGrad.addColorStop(0, `rgba(240, 249, 242, ${0.7 * s.depth})`);
          sphereGrad.addColorStop(0.38, `rgba(178, 216, 188, ${0.34 * s.depth})`);
          sphereGrad.addColorStop(0.8, `rgba(112, 168, 128, ${0.24 * s.depth})`);
          sphereGrad.addColorStop(1, `rgba(78, 134, 96, ${0.18 * s.depth})`);
        }
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // 3. Soft top-left specular crescent rim highlight (gives the unmistakable 3D orb look)
      ctx.beginPath();
      ctx.arc(x, y, r - 0.5, Math.PI * 0.95, Math.PI * 1.68);
      ctx.strokeStyle = dark
        ? `rgba(116, 214, 148, ${0.26 * s.depth})`
        : `rgba(255, 255, 255, ${0.65 * s.depth})`;
      ctx.lineWidth = Math.max(1, r * 0.025);
      ctx.lineCap = 'round';
      ctx.stroke();

      // 4. Subtle full perimeter rim
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = dark
        ? `rgba(56, 132, 82, ${0.16 * s.depth})`
        : `rgba(88, 148, 106, ${0.15 * s.depth})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Subtle interactive pointer spotlight
      if (pointerRef.current.active) {
        const spot = ctx.createRadialGradient(
          pointerRef.current.x,
          pointerRef.current.y,
          12,
          pointerRef.current.x,
          pointerRef.current.y,
          320
        );
        if (isDark) {
          spot.addColorStop(0, 'rgba(46, 138, 82, 0.09)');
          spot.addColorStop(0.5, 'rgba(26, 82, 48, 0.04)');
          spot.addColorStop(1, 'rgba(10, 24, 15, 0)');
        } else {
          spot.addColorStop(0, 'rgba(46, 138, 82, 0.06)');
          spot.addColorStop(1, 'rgba(46, 138, 82, 0)');
        }
        ctx.fillStyle = spot;
        ctx.fillRect(0, 0, width, height);
      }

      // Update & draw click sonar waves
      for (let i = wavesRef.current.length - 1; i >= 0; i--) {
        const w = wavesRef.current[i];
        w.radius += 3.2;
        w.alpha *= 0.94;
        if (w.radius >= w.maxRadius || w.alpha < 0.008) {
          wavesRef.current.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isDark
          ? `rgba(74, 182, 114, ${w.alpha})`
          : `rgba(42, 122, 72, ${w.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Update & draw 3D AI spheres
      for (let i = 0; i < spheres.length; i++) {
        const s = spheres[i];
        s.phase += s.pulseSpeed;
        s.x += s.vx + Math.sin(s.phase * 0.7) * 0.22 * s.depth;
        s.y += s.vy + Math.cos(s.phase * 0.5) * 0.12 * s.depth;

        // Interactive pointer physics (smooth elastic repulsion + slight scale swell)
        if (pointerRef.current.active) {
          const dx = s.x - pointerRef.current.x;
          const dy = s.y - pointerRef.current.y;
          const distSq = dx * dx + dy * dy;
          const interactRadius = 210;
          if (distSq < interactRadius * interactRadius && distSq > 1) {
            const dist = Math.sqrt(distSq);
            const factor = (interactRadius - dist) / interactRadius;
            s.x += (dx / dist) * factor * 2.4 * s.depth;
            s.y += (dy / dist) * factor * 2.4 * s.depth;
            s.radius = s.baseRadius * (1 + factor * 0.14);
          } else {
            s.radius += (s.baseRadius - s.radius) * 0.08;
          }
        } else {
          s.radius = s.baseRadius + Math.sin(s.phase) * 2.5;
        }

        // Wrap around screen edges smoothly
        if (s.y + s.radius < -40) {
          s.y = height + s.radius + 30;
          s.x = Math.random() * width;
        }
        if (s.y - s.radius > height + 60) {
          s.y = -s.radius - 20;
        }
        if (s.x - s.radius > width + 40) s.x = -s.radius - 20;
        if (s.x + s.radius < -40) s.x = width + s.radius + 20;

        draw3DSphere(s, isDark);
      }

      animationFrameId = window.requestAnimationFrame(render);
    };

    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleClick);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
