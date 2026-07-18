import * as React from "react";

interface ConfettiEffectProps {
  trigger: boolean;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

const COLORS = ["#4285F4", "#34A853", "#FBBC05", "#EA4335", "#A855F7", "#EC4899"];

export const ConfettiEffect: React.FC<ConfettiEffectProps> = ({ trigger }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animationRef = React.useRef<number | null>(null);
  const particlesRef = React.useRef<Particle[]>([]);

  const initParticles = (width: number, height: number) => {
    const particles: Particle[] = [];
    const count = 150; // number of confetti particles

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: -10 - Math.random() * 50, // start slightly above screen
        size: Math.random() * 6 + 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 5 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 5 - 2.5,
        opacity: 1,
      });
    }
    particlesRef.current = particles;
  };

  React.useEffect(() => {
    if (!trigger) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    initParticles(canvas.width, canvas.height);

    const updateAndDraw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      let allFallen = true;

      particles.forEach((p) => {
        // Apply simple physics
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        // Draw rectangle particle
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        ctx.restore();

        // Slow fade out near bottom
        if (p.y > canvas.height - 100) {
          p.opacity -= 0.02;
        }

        if (p.y < canvas.height && p.opacity > 0) {
          allFallen = false;
        }
      });

      if (!allFallen) {
        animationRef.current = requestAnimationFrame(updateAndDraw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    updateAndDraw();

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [trigger]);

  if (!trigger) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none w-full h-full"
    />
  );
};
