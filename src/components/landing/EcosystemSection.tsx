import { useEffect, useRef } from "react";
import "./ecosystem.css";

const MODULE_KEYS = [
  "scope",
  "supplier",
  "risk",
  "accounting",
  "ai",
  "analytics",
  "markets",
  "esg",
  "reporting",
  "planner",
  "supply",
  "mrv",
] as const;

/** Clockwise from top — progressive ecosystem assemble order */
const LAUNCH_ORDER = [
  "scope",
  "risk",
  "accounting",
  "markets",
  "esg",
  "mrv",
  "supply",
  "planner",
  "reporting",
  "analytics",
  "ai",
  "supplier",
] as const;

const STAGGER_MS = 85;
const BOOT_MS = 520;
const CARD_LAUNCH_MS = 1350;

function randomSeries(n: number, base: number) {
  const arr: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += (Math.random() - 0.45) * 0.13;
    v = Math.max(0.15, Math.min(0.9, v));
    arr.push(v);
  }
  return arr;
}

function buildSpark(
  el: SVGSVGElement,
  w: number,
  h: number,
  points: number[],
  filled: boolean
) {
  const step = w / (points.length - 1);
  let d = `M0 ${h - points[0] * h}`;
  points.forEach((p, i) => {
    if (i > 0) d += ` L${i * step} ${h - p * h}`;
  });
  el.querySelector(".line")?.setAttribute("d", d);
  const line2 = el.querySelector(".line2");
  if (line2) {
    let d2 = `M0 ${h - points[0] * 0.7 * h}`;
    points.forEach((p, i) => {
      if (i > 0) d2 += ` L${i * step} ${h - p * 0.7 * h}`;
    });
    line2.setAttribute("d", d2);
  }
  if (filled) {
    const fillPath = el.querySelector(".fill");
    if (fillPath) fillPath.setAttribute("d", `${d} L${w} ${h} L0 ${h} Z`);
  }
}

const EcosystemSection = () => {
  const ecosystemRef = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<SVGSVGElement>(null);
  const modulesRef = useRef<HTMLDivElement>(null);
  const sparklineRef = useRef<SVGSVGElement>(null);
  const sparkDataRef = useRef(randomSeries(9, 0.4));

  useEffect(() => {
    const container = ecosystemRef.current;
    const glow = glowRef.current;
    const canvas = canvasRef.current;
    const svg = networkRef.current;
    const modulesWrap = modulesRef.current;
    const analyticsSpark = sparklineRef.current;

    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

    let isVisible = true;
    let mainRaf = 0;
    let glowRaf = 0;
    let tiltRaf = 0;
    let pendingGlowX = 0;
    let pendingGlowY = 0;
    let activeTiltCard: HTMLElement | null = null;
    let entrancePlayed = false;
    let particleBoost = 1;
    const timers: number[] = [];
    const cleanups: (() => void)[] = [];

    const schedule = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      timers.push(id);
      return id;
    };

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        container.classList.toggle("is-paused", !isVisible);
        if (isVisible && !prefersReducedMotion) startMainLoop();
        else stopMainLoop();
      },
      { threshold: 0.06, rootMargin: "80px" }
    );
    visibilityObserver.observe(container);

    const stopMainLoop = () => {
      if (mainRaf) cancelAnimationFrame(mainRaf);
      mainRaf = 0;
    };

    const startMainLoop = () => {
      if (mainRaf || prefersReducedMotion) return;
      mainRaf = requestAnimationFrame(mainLoop);
    };

    const particles: { x: number; y: number; vx: number; vy: number; r: number }[] =
      [];
    let ctx: CanvasRenderingContext2D | null = null;
    let canvasW = 0;
    let canvasH = 0;

    const resizeCanvas = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvasW = canvas.offsetWidth;
      canvasH = canvas.offsetHeight;
      canvas.width = Math.floor(canvasW * dpr);
      canvas.height = Math.floor(canvasH * dpr);
      ctx = canvas.getContext("2d", { alpha: true });
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particles.length === 0) {
        for (let i = 0; i < 52; i++) {
          particles.push({
            x: Math.random() * canvasW,
            y: Math.random() * canvasH,
            vx: (Math.random() - 0.5) * 0.12,
            vy: (Math.random() - 0.5) * 0.12,
            r: Math.random() * 1.2 + 0.35,
          });
        }
      }
    };

    if (canvas) {
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas, { passive: true });
    }

    const paths = svg
      ? Array.from(svg.querySelectorAll<SVGPathElement>(".connection"))
      : [];
    const energyDots: {
      path: SVGPathElement;
      circle: SVGCircleElement;
      offset: number;
      length: number;
    }[] = [];

    if (svg && !prefersReducedMotion) {
      paths.forEach((path, index) => {
        if (index % 2 !== 0) return;
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("r", "2");
        circle.setAttribute("fill", "#1D9E75");
        circle.setAttribute("opacity", "0.75");
        svg.appendChild(circle);
        energyDots.push({
          path,
          circle,
          offset: Math.random(),
          length: path.getTotalLength(),
        });
      });
    }

    const recachePathLengths = () => {
      energyDots.forEach((dot) => {
        dot.length = dot.path.getTotalLength();
      });
    };
    window.addEventListener("resize", recachePathLengths, { passive: true });

    const drawParticles = () => {
      if (!ctx || !canvasW || !canvasH) return;
      const alpha = 0.16 * (particleBoost > 1 ? 1 + (particleBoost - 1) * 0.8 : 1);
      ctx.clearRect(0, 0, canvasW, canvasH);
      ctx.fillStyle = `rgba(15,110,86,${alpha})`;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * particleBoost;
        p.y += p.vy * particleBoost;
        if (p.x < 0) p.x = canvasW;
        else if (p.x > canvasW) p.x = 0;
        if (p.y < 0) p.y = canvasH;
        else if (p.y > canvasH) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawEnergy = () => {
      for (let i = 0; i < energyDots.length; i++) {
        const dot = energyDots[i];
        dot.offset += 0.0014 * particleBoost;
        if (dot.offset > 1) dot.offset = 0;
        const point = dot.path.getPointAtLength(dot.length * dot.offset);
        dot.circle.setAttribute("cx", String(point.x));
        dot.circle.setAttribute("cy", String(point.y));
      }
    };

    const mainLoop = () => {
      if (!isVisible) {
        mainRaf = 0;
        return;
      }
      drawParticles();
      drawEnergy();
      mainRaf = requestAnimationFrame(mainLoop);
    };

    if (!prefersReducedMotion) startMainLoop();

    const applyGlow = () => {
      if (!glow) return;
      glow.style.left = `${pendingGlowX}px`;
      glow.style.top = `${pendingGlowY}px`;
      glowRaf = 0;
    };

    const onMouseMove = (e: MouseEvent) => {
      const r = container.getBoundingClientRect();
      pendingGlowX = e.clientX - r.left;
      pendingGlowY = e.clientY - r.top;
      if (!glowRaf) glowRaf = requestAnimationFrame(applyGlow);
    };

    container.addEventListener("mousemove", onMouseMove, { passive: true });

    const modules = Array.from(container.querySelectorAll<HTMLElement>(".module"));

    const firePulse = (
      path: SVGPathElement,
      opts?: { trail?: boolean; duration?: number }
    ) => {
      if (!svg || prefersReducedMotion) return;
      const length = path.getTotalLength();
      const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      pulse.setAttribute("r", opts?.trail ? "3.2" : "2.8");
      pulse.setAttribute("fill", opts?.trail ? "#5DCAA5" : "#DFFBEF");
      pulse.setAttribute("class", "entrance-energy");
      svg.appendChild(pulse);

      const trailDots: SVGCircleElement[] = [];
      if (opts?.trail) {
        for (let i = 0; i < 4; i++) {
          const t = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          t.setAttribute("r", String(2.2 - i * 0.35));
          t.setAttribute("fill", "#22C58B");
          t.setAttribute("opacity", "0");
          svg.appendChild(t);
          trailDots.push(t);
        }
      }

      const durationFactor = opts?.duration ?? 0.035;
      let t = 0;
      const history: { x: number; y: number }[] = [];
      const step = () => {
        t += durationFactor;
        if (t > 1) {
          pulse.remove();
          trailDots.forEach((d) => d.remove());
          return;
        }
        const pt = path.getPointAtLength(length * t);
        pulse.setAttribute("cx", String(pt.x));
        pulse.setAttribute("cy", String(pt.y));
        pulse.setAttribute("opacity", String(0.95 - t * 0.55));
        history.unshift({ x: pt.x, y: pt.y });
        if (history.length > 8) history.pop();
        trailDots.forEach((dot, i) => {
          const sample = history[Math.min(history.length - 1, (i + 1) * 2)];
          if (!sample) return;
          dot.setAttribute("cx", String(sample.x));
          dot.setAttribute("cy", String(sample.y));
          dot.setAttribute("opacity", String(Math.max(0, 0.45 - i * 0.1 - t * 0.25)));
        });
        requestAnimationFrame(step);
      };
      step();
    };

    modules.forEach((mod) => {
      const card = mod.querySelector<HTMLElement>(".moduleCard");
      const name = [...mod.classList].find((c) => c !== "module");
      const path = name
        ? svg?.querySelector<SVGPathElement>(`path[data-target="${name}"]`)
        : null;

      const onEnter = () => {
        if (!container.classList.contains("is-ready")) return;
        modulesWrap?.classList.add("hovering");
        container.classList.add("node-hovered");
        if (path) {
          path.classList.add("active");
          firePulse(path);
        }
      };

      const onMove = () => {
        if (!container.classList.contains("is-ready")) return;
        if (!card || coarsePointer) return;
        activeTiltCard = card;
        if (!tiltRaf) {
          tiltRaf = requestAnimationFrame(() => {
            if (activeTiltCard) {
              activeTiltCard.style.transform = "translate3d(0,-4px,0) scale(1.02)";
            }
            tiltRaf = 0;
          });
        }
      };

      const onLeave = () => {
        if (card) {
          card.style.transform = "";
          if (activeTiltCard === card) activeTiltCard = null;
        }
        modulesWrap?.classList.remove("hovering");
        container.classList.remove("node-hovered");
        path?.classList.remove("active");
      };

      mod.addEventListener("mouseenter", onEnter);
      mod.addEventListener("mousemove", onMove, { passive: true });
      mod.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        mod.removeEventListener("mouseenter", onEnter);
        mod.removeEventListener("mousemove", onMove);
        mod.removeEventListener("mouseleave", onLeave);
      });
    });

    const computeLaunchOffsets = () => {
      const centerEl = container.querySelector<HTMLElement>(".center");
      if (!centerEl) return;
      const centerRect = centerEl.getBoundingClientRect();
      const cx = centerRect.left + centerRect.width / 2;
      const cy = centerRect.top + centerRect.height / 2;

      modules.forEach((mod) => {
        const rect = mod.getBoundingClientRect();
        const mx = rect.left + rect.width / 2;
        const my = rect.top + rect.height / 2;
        mod.style.setProperty("--launch-x", `${(cx - mx).toFixed(1)}px`);
        mod.style.setProperty("--launch-y", `${(cy - my).toFixed(1)}px`);
      });
    };

    const markReady = () => {
      container.classList.remove(
        "is-entrance-pending",
        "is-booting",
        "is-assembling",
        "prefers-reduced-entrance"
      );
      container.classList.add("is-ready");
      particleBoost = 1;
      modules.forEach((mod) => {
        mod.classList.remove("is-launching", "is-settled");
        mod.style.removeProperty("--launch-x");
        mod.style.removeProperty("--launch-y");
        const card = mod.querySelector<HTMLElement>(".moduleCard");
        if (card) card.style.willChange = "auto";
      });
      paths.forEach((p) => p.classList.add("is-revealed"));
    };

    const assembleEcosystem = () => {
      computeLaunchOffsets();
      container.classList.remove("is-entrance-pending", "is-booting");
      container.classList.add("is-assembling");
      particleBoost = 1.85;

      LAUNCH_ORDER.forEach((key, index) => {
        const mod = container.querySelector<HTMLElement>(`.module.${key}`);
        if (!mod) return;
        const card = mod.querySelector<HTMLElement>(".moduleCard");
        const path = svg?.querySelector<SVGPathElement>(`path[data-target="${key}"]`);
        const lx = mod.style.getPropertyValue("--launch-x").trim() || "0px";
        const ly = mod.style.getPropertyValue("--launch-y").trim() || "0px";

        schedule(() => {
          mod.classList.add("is-launching");
          if (path) {
            path.classList.add("is-revealed");
            firePulse(path, { trail: true, duration: 0.028 });
          }

          if (card) {
            card.style.willChange = "transform, opacity";
            const anim = card.animate(
              [
                {
                  opacity: 0,
                  filter: "blur(10px)",
                  transform: `translate3d(${lx}, ${ly}, 0) scale(0.25)`,
                },
                {
                  opacity: 1,
                  filter: "blur(0px)",
                  transform: "translate3d(0, 0, 0) scale(1.05)",
                  offset: 0.78,
                },
                {
                  opacity: 1,
                  filter: "blur(0px)",
                  transform: "translate3d(0, 0, 0) scale(1)",
                },
              ],
              {
                duration: CARD_LAUNCH_MS,
                easing: "cubic-bezier(0.22, 1.15, 0.36, 1)",
                fill: "forwards",
              }
            );

            anim.finished
              .then(() => {
                mod.classList.remove("is-launching");
                mod.classList.add("is-settled");
                card.style.opacity = "1";
                card.style.filter = "none";
                card.style.transform = "";
                card.style.willChange = "auto";
                anim.cancel();
              })
              .catch(() => {
                mod.classList.remove("is-launching");
                mod.classList.add("is-settled");
              });
          } else {
            schedule(() => {
              mod.classList.remove("is-launching");
              mod.classList.add("is-settled");
            }, CARD_LAUNCH_MS);
          }
        }, index * STAGGER_MS);
      });

      const totalMs =
        (LAUNCH_ORDER.length - 1) * STAGGER_MS + CARD_LAUNCH_MS + 80;
      schedule(() => {
        const start = performance.now();
        const from = particleBoost;
        const easeBoost = (now: number) => {
          const t = Math.min(1, (now - start) / 480);
          particleBoost = from + (1 - from) * t;
          if (t < 1) requestAnimationFrame(easeBoost);
          else markReady();
        };
        requestAnimationFrame(easeBoost);
      }, totalMs);
    };

    const entranceObserver = new IntersectionObserver(
      ([entry]) => {
        if (
          !entrancePlayed &&
          entry.isIntersecting &&
          entry.intersectionRatio >= 0.35
        ) {
          playEntrance();
        }
      },
      { threshold: [0, 0.2, 0.35, 0.4, 0.5] }
    );

    const playEntrance = () => {
      if (entrancePlayed) return;
      entrancePlayed = true;
      entranceObserver.disconnect();

      if (prefersReducedMotion) {
        container.classList.add("prefers-reduced-entrance");
        schedule(() => {
          container.classList.add("is-ready");
          container.classList.remove(
            "is-entrance-pending",
            "prefers-reduced-entrance"
          );
          paths.forEach((p) => p.classList.add("is-revealed"));
        }, 40);
        return;
      }

      computeLaunchOffsets();
      container.classList.remove("is-entrance-pending");
      container.classList.add("is-booting");
      if (!mainRaf) startMainLoop();

      schedule(() => {
        assembleEcosystem();
      }, BOOT_MS);
    };

    if (prefersReducedMotion) {
      container.classList.add("prefers-reduced-entrance", "is-entrance-pending");
    } else {
      container.classList.add("is-entrance-pending");
      computeLaunchOffsets();
      schedule(computeLaunchOffsets, 50);
      schedule(computeLaunchOffsets, 200);
    }

    entranceObserver.observe(container);

    const onResizeOffsets = () => {
      if (
        container.classList.contains("is-entrance-pending") ||
        container.classList.contains("is-booting")
      ) {
        computeLaunchOffsets();
      }
    };
    window.addEventListener("resize", onResizeOffsets, { passive: true });

    if (analyticsSpark) {
      buildSpark(analyticsSpark, 240, 52, sparkDataRef.current, true);
    }

    const sparkInterval =
      !prefersReducedMotion && analyticsSpark
        ? window.setInterval(() => {
            sparkDataRef.current = sparkDataRef.current.map((v) =>
              Math.max(0.15, Math.min(0.9, v + (Math.random() - 0.5) * 0.08))
            );
            buildSpark(analyticsSpark, 240, 52, sparkDataRef.current, true);
          }, 5000)
        : undefined;

    return () => {
      visibilityObserver.disconnect();
      entranceObserver.disconnect();
      stopMainLoop();
      container.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("resize", recachePathLengths);
      window.removeEventListener("resize", onResizeOffsets);
      if (glowRaf) cancelAnimationFrame(glowRaf);
      if (tiltRaf) cancelAnimationFrame(tiltRaf);
      if (sparkInterval) clearInterval(sparkInterval);
      timers.forEach((id) => clearTimeout(id));
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <div className="ecosystem-wrap">
      <section
        ref={ecosystemRef}
        className="ecosystem is-entrance-pending"
        id="features"
        aria-label="Platform ecosystem"
      >
        <canvas ref={canvasRef} className="ecosystem-particles" aria-hidden />

        <div className="dust" aria-hidden />
        <div className="aurora" aria-hidden />
        <div className="grid" aria-hidden />
        <div className="noise" aria-hidden />
        <div ref={glowRef} className="mouseGlow" aria-hidden />
        <div className="bootRipple" aria-hidden />

        <svg
          ref={networkRef}
          className="network"
          viewBox="0 0 1280 1090"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <filter id="ecosystemGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3.2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="ecosystemSparkGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22C58B" />
              <stop offset="100%" stopColor="#9FEED1" />
            </linearGradient>
            <linearGradient id="ecosystemRadarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5DCAA5" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#22C58B" stopOpacity="0.12" />
            </linearGradient>
          </defs>

          {MODULE_KEYS.map((key) => {
            const routePaths: Record<string, string> = {
              scope: "M640 545 L660 141",
              supplier: "M640 545 L300 259",
              risk: "M640 545 L1000 230",
              accounting: "M640 545 L860 370",
              ai: "M640 545 L470 474",
              analytics: "M640 545 L155 549",
              markets: "M640 545 L1165 549",
              esg: "M640 545 L840 609",
              reporting: "M640 545 L550 694",
              planner: "M640 545 L300 869",
              supply: "M640 545 L660 989",
              mrv: "M640 545 L980 869",
            };
            return (
              <path
                key={key}
                className="connection"
                data-target={key}
                pathLength={100}
                d={routePaths[key]}
              />
            );
          })}
        </svg>

        <div className="center">
          <div className="core">
            <div className="coreGlow" />
            <div className="brand">Rethink Carbon</div>
          </div>
        </div>

        <div className="orbs" aria-hidden>
          <div className="orb" />
          <div className="orb" />
          <div className="orb" />
          <div className="orb" />
        </div>

        <div ref={modulesRef} className="modules">
          <div className="module scope">
            <div className="moduleCard">
              <div className="moduleGlow" />
              <div className="shine" />
              <div className="topRow">
                <div className="moduleIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18" />
                    <path d="M12 3c3 3.6 3 14.4 0 18M12 3c-3 3.6-3 14.4 0 18" />
                  </svg>
                </div>
                <div className="statusDot" />
              </div>
              <div className="moduleTitle">Scope 3 Intelligence</div>
              <div className="headline">Value chain emissions mapped and prioritised.</div>
              <div className="miniLabel">Top value chain contributors</div>
              <div className="checklist">
                <div className="checkItem">
                  <span className="checkIcon done"><span className="dotPulse" /></span>
                  62% Purchased Goods
                </div>
                <div className="checkItem">
                  <span className="checkIcon pending" />
                  21% Upstream Transport
                </div>
                <div className="checkItem">
                  <span className="checkIcon pending" />
                  17% Business Travel
                </div>
              </div>
            </div>
          </div>

          <div className="module supplier">
            <div className="moduleCard">
              <div className="moduleGlow" />
              <div className="shine" />
              <div className="topRow">
                <div className="moduleIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 12l2.5 2.5L16 9" />
                    <path d="M3 8l3-3h5l3 3" />
                    <path d="M3 8v6l3 3h5l3-3V8" />
                  </svg>
                </div>
                <div className="statusDot" />
              </div>
              <div className="moduleTitle">Supplier Engagement</div>
              <div className="headline">Scorecards and outreach to drive supplier action.</div>
              <div className="miniLabel">Supplier engagement</div>
              <div className="signalRow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12h16" />
                  <path d="M12 4v16" />
                </svg>
                32 suppliers engaged
              </div>
            </div>
          </div>

          <div className="module risk">
            <div className="moduleCard">
              <div className="moduleGlow" />
              <div className="shine" />
              <div className="topRow">
                <div className="moduleIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6.5 19a4.5 4.5 0 010-9 6 6 0 0111.3-2A4 4 0 0118 19H6.5z" />
                  </svg>
                </div>
                <div className="statusDot" />
              </div>
              <div className="moduleTitle">Climate Risk</div>
              <div className="headline">Physical and transition risk scenario modelling.</div>
              <div className="miniLabel">Physical risk exposure</div>
              <div className="gaugeWrap">
                <svg width="128" height="72" viewBox="0 0 128 72">
                  <path d="M10 66 A54 54 0 0 1 43 15" fill="none" stroke="#22C58B" strokeWidth="9" strokeLinecap="round" />
                  <path d="M43 15 A54 54 0 0 1 85 15" fill="none" stroke="#E8B84D" strokeWidth="9" strokeLinecap="round" />
                  <path d="M85 15 A54 54 0 0 1 118 66" fill="none" stroke="#E86B6B" strokeWidth="9" strokeLinecap="round" opacity="0.55" />
                  <g transform="rotate(28 64 66)">
                    <line x1="64" y1="66" x2="64" y2="20" stroke="#F6FAF9" strokeWidth="2.5" strokeLinecap="round" />
                  </g>
                  <circle cx="64" cy="66" r="5" fill="#F6FAF9" />
                </svg>
                <div className="gaugeLabel">Moderate, 2030 Scenario</div>
                <div className="gaugeSub">Physical Risk Exposure</div>
              </div>
            </div>
          </div>

          <div className="module accounting">
            <div className="moduleCard">
              <div className="moduleGlow" />
              <div className="shine" />
              <div className="topRow">
                <div className="moduleIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="3" width="14" height="18" rx="2" />
                    <path d="M9 8h6M9 12h6M9 16h3" />
                  </svg>
                </div>
              </div>
              <div className="moduleTitle">Carbon Accounting</div>
              <div className="headline">Automated scope 1, 2 and 3 emissions calculation.</div>
              <div className="miniLabel">Emissions by category</div>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: "72%" }} />
              </div>
              <div className="progressCaption">Scope 1 &amp; 2</div>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: "88%" }} />
              </div>
              <div className="progressCaption">Scope 3</div>
            </div>
          </div>

          <div className="module ai">
            <div className="moduleCard">
              <div className="moduleGlow" />
              <div className="shine" />
              <div className="topRow">
                <div className="moduleIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="7" y="7" width="10" height="10" rx="2" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
                  </svg>
                </div>
                <div className="statusDot" />
              </div>
              <div className="moduleTitle">AI Carbon Strategist</div>
              <div className="headline">AI-guided recommendations for reduction pathways.</div>
              <div className="miniLabel">Recommendation</div>
              <div className="feed">
                <div className="feedRow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.2-6.3-4.4L5.7 21l2.3-7.2-6-4.4h7.6z" />
                  </svg>
                  Prioritise supplier engagement in your top 3 emission categories.
                </div>
              </div>
            </div>
          </div>

          <div className="module analytics">
            <div className="moduleCard">
              <div className="moduleGlow" />
              <div className="shine" />
              <div className="topRow">
                <div className="moduleIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 17l6-6 4 4 8-8" />
                    <path d="M15 7h6v6" />
                  </svg>
                </div>
                <div className="statusDot" />
              </div>
              <div className="moduleTitle">Analytics</div>
              <div className="headline">Portfolio-wide performance trends at a glance.</div>
              <div className="miniLabel">Last 12 months</div>
              <svg
                ref={sparklineRef}
                className="sparkline"
                width="100%"
                height="52"
                viewBox="0 0 240 52"
                preserveAspectRatio="none"
              >
                <path className="fill" d="" fill="url(#ecosystemSparkGrad)" />
                <path className="line" d="" />
                <path className="line2" d="" />
              </svg>
              <div className="signalRow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 11-2.6-6.4" />
                  <path d="M21 4v6h-6" />
                </svg>
                Portfolio performance trend
              </div>
            </div>
          </div>

          <div className="module markets">
            <div className="moduleCard">
              <div className="moduleGlow" />
              <div className="shine" />
              <div className="topRow">
                <div className="moduleIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 21c9 0 14-5 14-14 0-1 0-2-.2-3C10 5 5 10 5 19c0 .7 0 1.4.1 2z" />
                    <path d="M5 21c3-5 6-8 12-11" />
                  </svg>
                </div>
              </div>
              <div className="moduleTitle">Carbon Markets</div>
              <div className="headline">Credit pricing, sourcing and portfolio tracking.</div>
              <div className="miniLabel">Credit Portfolio Value</div>
              <div className="signalRow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v18M3 12h18" />
                </svg>
                Tracked across 4 project types
              </div>
            </div>
          </div>

          <div className="module esg">
            <div className="moduleCard">
              <div className="moduleGlow" />
              <div className="shine" />
              <div className="topRow">
                <div className="moduleIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l7 3v6c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V6l7-3z" />
                  </svg>
                </div>
                <div className="statusDot" />
              </div>
              <div className="moduleTitle">ESG Assessments</div>
              <div className="headline">Readiness scoring against global disclosure standards.</div>
              <div className="badgeRow">
                <span className="badge">Recommended methodology</span>
                <span className="badge">98% match confidence</span>
              </div>
            </div>
          </div>

          <div className="module reporting">
            <div className="moduleCard">
              <div className="moduleGlow" />
              <div className="shine" />
              <div className="topRow">
                <div className="moduleIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4" />
                    <rect x="4" y="4" width="16" height="17" rx="2" />
                    <path d="M9 4V2h6v2" />
                  </svg>
                </div>
              </div>
              <div className="moduleTitle">Reporting and Compliance</div>
              <div className="headline">Standards-aligned reporting, ready for disclosure.</div>
              <div className="miniLabel">Corporate footprint report</div>
              <div className="badgeRow">
                <span className="badge">Select Year</span>
                <span className="badge">2026</span>
              </div>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: "76%" }} />
              </div>
              <div className="progressCaption">Report completeness</div>
            </div>
          </div>

          <div className="module planner">
            <div className="moduleCard">
              <div className="moduleGlow" />
              <div className="shine" />
              <div className="topRow">
                <div className="moduleIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19c4-9 8 4 12-5 1.5-3.3 2.7-4.6 4-5" />
                  </svg>
                </div>
                <div className="statusDot" />
              </div>
              <div className="moduleTitle">Decarbonisation Planner</div>
              <div className="headline">Target setting, forecasting and action tracking.</div>
              <div className="miniLabel">Reduction target progress</div>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: "58%" }} />
              </div>
              <div className="progressCaption">58%</div>
            </div>
          </div>

          <div className="module supply">
            <div className="moduleCard">
              <div className="moduleGlow" />
              <div className="shine" />
              <div className="topRow">
                <div className="moduleIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="7" width="13" height="10" rx="1" />
                    <path d="M14 10h4l3 3v4h-7z" />
                    <circle cx="6" cy="19" r="1.6" />
                    <circle cx="17" cy="19" r="1.6" />
                  </svg>
                </div>
                <div className="statusDot" />
              </div>
              <div className="moduleTitle">Supply Chain</div>
              <div className="headline">End-to-end visibility across your supplier network.</div>
              <div className="miniLabel">Supplier onboarding progress</div>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: "84%" }} />
              </div>
              <div className="progressCaption">84%</div>
            </div>
          </div>

          <div className="module mrv">
            <div className="moduleCard">
              <div className="moduleGlow" />
              <div className="shine" />
              <div className="topRow">
                <div className="moduleIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l7 3v6c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V5l7-3z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <div className="statusDot" />
              </div>
              <div className="moduleTitle">MRV</div>
              <div className="headline">Audit-ready monitoring, reporting and verification.</div>
              <div className="miniLabel">Verification Status</div>
              <div className="signalRow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12l5 5L20 6" />
                </svg>
                12 of 14 sites verified
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EcosystemSection;
