import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import MainHeader from "@/components/layout/MainHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { isCompanyUser } from "@/utils/roleUtils";

const LoginScreen = () => {
  const prefersReducedMotion = useReducedMotion();
  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const redirectTo = searchParams.get("redirect");

  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let frameId = 0;
    let t = 0;

    type Node = { baseAngle: number; baseDist: number; speed: number; size: number };
    const nodes: Node[] = Array.from({ length: 18 }, (_, i) => ({
      baseAngle: (i / 18) * Math.PI * 2,
      baseDist: 0.1 + (i % 5) * 0.05,
      speed: 0.07 + (i % 4) * 0.02,
      size: 1.3 + (i % 3) * 0.4,
    }));

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const cx = width * 0.28;
      const cy = height * 0.45;
      const maxR = Math.max(width, height) * 0.55;

      for (let i = 0; i < 5; i++) {
        const phase = (t * 0.15 + i * 0.5) % 1;
        const radius = maxR * (0.16 + phase * 0.84);
        const alpha = (1 - phase) * 0.16;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(93,202,165,${alpha})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      const points = nodes.map((node, i) => {
        const angle = node.baseAngle + t * node.speed;
        const breathe = 1 + 0.07 * Math.sin(t * 1.05 + i);
        const dist = height * node.baseDist * breathe;
        return {
          x: cx + Math.cos(angle) * dist * 1.35,
          y: cy + Math.sin(angle) * dist,
          pulse: 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.4 + i)),
          size: node.size,
        };
      });

      const linkDist = Math.min(width, height) * 0.14;
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const d = Math.hypot(dx, dy);
          if (d < linkDist) {
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.strokeStyle = `rgba(51,192,138,${(1 - d / linkDist) * 0.18})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + p.pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(29,158,117,${0.16 + p.pulse * 0.24})`;
        ctx.fill();
      }
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduceMotion) {
      draw();
    } else {
      const loop = () => {
        t += 0.008;
        draw();
        frameId = window.requestAnimationFrame(loop);
      };
      loop();
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  if (authLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#0a1a1d]"
        style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
      >
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#33C08A]/25 border-t-[#33C08A]" />
      </div>
    );
  }

  if (user && !authLoading) {
    if (isCompanyUser(user)) {
      navigate("/dashboard");
    } else {
      navigate("/explore");
    }
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          title: "Error signing in",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You've been signed in successfully.",
        });
        if (redirectTo) {
          navigate(redirectTo);
        } else {
          navigate("/");
        }
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "h-11 rounded-xl border-[#D5E5DD] bg-white text-[#0A4D3E] placeholder:text-[#7A958B] focus-visible:ring-[#1D9E75]/35 sm:h-12";

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#0a1a1d]"
      style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
    >
      <canvas
        ref={heroCanvasRef}
        aria-hidden
        className="absolute inset-0 h-full w-full"
      />
      <div
        aria-hidden
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(80% 70% at 20% 40%, rgba(29,158,117,0.16) 0%, rgba(10,26,29,0) 55%), linear-gradient(to right, rgba(10,26,29,0.35) 0%, rgba(10,26,29,0.55) 45%, rgba(10,26,29,0.85) 100%)",
        }}
      />

      {!prefersReducedMotion && (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-[12%] top-[24%] z-[1] h-40 w-40 rounded-full border border-white/10"
            animate={{ y: [0, -14, 0], opacity: [0.2, 0.42, 0.2] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute bottom-[18%] left-[22%] z-[1] h-24 w-24 rotate-45 border border-[#33C08A]/15"
            animate={{ y: [0, 12, 0], opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 9.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      <MainHeader />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-4 pb-12 pt-28 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:pb-16 lg:pt-24">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="hidden text-white lg:block"
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#9FE1CB] sm:text-xs">
            Sign In
          </p>
          <h1 className="max-w-md text-4xl font-semibold leading-[1.15] tracking-tight lg:text-5xl">
            Welcome back to{" "}
            <span className="hero-shimmer inline-block bg-gradient-to-r from-[#33C08A] via-[#DFFBEF] to-[#33C08A] bg-clip-text pb-[0.12em] text-transparent">
              Rethink Carbon
            </span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/65 lg:text-lg">
            Access your climate intelligence workspace — projects, reporting, and market insights in one place.
          </p>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 22 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-[#DCEAE2] bg-white shadow-[0_24px_60px_-28px_rgba(12,77,62,0.45)] lg:mx-0 lg:justify-self-end"
        >
          <div className="border-b border-[#E6F0EB] bg-[#F7F4EE]/60 px-6 py-7 text-center sm:px-8 sm:py-8">
            <div className="mx-auto mb-4 flex h-16 w-40 items-center justify-center sm:h-20 sm:w-48">
              <img
                src="/new_logo.png"
                alt="Rethink Carbon Logo"
                className="h-full w-auto scale-[2.4] object-contain sm:scale-[2.6]"
              />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75] lg:hidden">
              Sign In
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-[#0A4D3E]">Welcome Back</h2>
            <p className="mt-2 text-sm text-[#4E6C63] sm:text-base">
              Sign in to your Rethink Carbon account
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-[#0A4D3E]">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={fieldClass}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-[#0A4D3E]">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`${fieldClass} pr-11`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-[#4E6C63] hover:bg-transparent hover:text-[#0A4D3E]"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-[#1D9E75] transition-colors hover:text-[#0A4D3E]"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="group h-12 w-full rounded-full bg-[#1D9E75] text-base font-semibold text-[#04342C] shadow-[0_14px_40px_-12px_rgba(29,158,117,0.55)] hover:bg-[#22B87E] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-[#04342C]/30 border-t-[#04342C]" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-1 h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/"
                className="text-sm text-[#4E6C63] transition-colors hover:text-[#0A4D3E]"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginScreen;
