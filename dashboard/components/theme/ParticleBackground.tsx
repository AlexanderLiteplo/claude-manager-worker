'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface ParticleBackgroundProps {
  /**
   * Number of particles to render
   */
  particleCount?: number;
  /**
   * Array of colors for particles (hex format)
   */
  colors?: string[];
  /**
   * Particle speed multiplier
   */
  speed?: number;
  /**
   * Maximum connection distance between particles
   */
  connectionDistance?: number;
  /**
   * Show connection lines between particles
   */
  showConnections?: boolean;
  /**
   * Background opacity (0-1)
   */
  opacity?: number;
  /**
   * Enable interaction on mouse move
   */
  interactive?: boolean;
  /**
   * Particle shape: 'circle' | 'star' | 'heart'
   */
  shape?: 'circle' | 'star' | 'heart';
  /**
   * Additional CSS class
   */
  className?: string;
}

// Sakura pink, sky blue, gold, purple
const DEFAULT_COLORS = ['#f43f5e', '#0ea5e9', '#eab308', '#a855f7', '#4ade80'];

export function ParticleBackground({
  particleCount = 50,
  colors = DEFAULT_COLORS,
  speed = 0.5,
  connectionDistance = 100,
  showConnections = true,
  opacity = 0.3,
  interactive = true,
  shape = 'circle',
  className = '',
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>(0);

  // Initialize particles
  const initParticles = useCallback(
    (width: number, height: number) => {
      const particles: Particle[] = [];

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          size: Math.random() * 3 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.5 + 0.5,
          life: 0,
          maxLife: Math.random() * 200 + 100,
        });
      }

      particlesRef.current = particles;
    },
    [particleCount, colors, speed]
  );

  // Draw a single particle
  const drawParticle = useCallback(
    (ctx: CanvasRenderingContext2D, p: Particle) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === 'star') {
        drawStar(ctx, p.x, p.y, 5, p.size * 2, p.size);
      } else if (shape === 'heart') {
        drawHeart(ctx, p.x, p.y, p.size * 2);
      }

      ctx.restore();
    },
    [shape]
  );

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles(canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      if (interactive) {
        mouseRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Animation
    const animate = () => {
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Mouse interaction
        if (interactive) {
          const dx = mouseRef.current.x - p.x;
          const dy = mouseRef.current.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            const force = (100 - dist) / 100;
            p.vx -= (dx / dist) * force * 0.02;
            p.vy -= (dy / dist) * force * 0.02;
          }
        }

        // Apply friction
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Update life/alpha for twinkling effect
        p.life++;
        if (p.life > p.maxLife) {
          p.life = 0;
          p.alpha = Math.random() * 0.5 + 0.5;
        }

        // Draw particle
        drawParticle(ctx, p);

        // Draw connections
        if (showConnections) {
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < connectionDistance) {
              ctx.beginPath();
              ctx.strokeStyle = p.color;
              ctx.globalAlpha = ((connectionDistance - dist) / connectionDistance) * 0.2;
              ctx.lineWidth = 0.5;
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationRef.current);
    };
  }, [initParticles, drawParticle, showConnections, connectionDistance, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ opacity, zIndex: -1 }}
    />
  );
}

// Helper function to draw a star
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }

  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

// Helper function to draw a heart
function drawHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number
) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + size / 4);

  ctx.bezierCurveTo(
    cx,
    cy,
    cx - size / 2,
    cy,
    cx - size / 2,
    cy + size / 4
  );

  ctx.bezierCurveTo(
    cx - size / 2,
    cy + size / 2,
    cx,
    cy + size * 0.75,
    cx,
    cy + size
  );

  ctx.bezierCurveTo(
    cx,
    cy + size * 0.75,
    cx + size / 2,
    cy + size / 2,
    cx + size / 2,
    cy + size / 4
  );

  ctx.bezierCurveTo(
    cx + size / 2,
    cy,
    cx,
    cy,
    cx,
    cy + size / 4
  );

  ctx.fill();
}

/**
 * Celebration burst effect (for victories/completions)
 */
export function CelebrationBurst({
  trigger,
  x,
  y,
  particleCount = 30,
  colors = DEFAULT_COLORS,
}: {
  trigger: boolean;
  x: number;
  y: number;
  particleCount?: number;
  colors?: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!trigger) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface BurstParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      gravity: number;
    }

    const particles: BurstParticle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const velocity = 5 + Math.random() * 10;

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        gravity: 0.2,
      });
    }

    let frame = 0;
    const maxFrames = 60;

    const animate = () => {
      if (frame >= maxFrames) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.alpha *= 0.95;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [trigger, x, y, particleCount, colors]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 100 }}
    />
  );
}
