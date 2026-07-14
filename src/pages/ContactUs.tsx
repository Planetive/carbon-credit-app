import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MainHeader from "@/components/layout/MainHeader";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import {
  Clock,
  Send,
  MessageSquare,
  Globe,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { sendContactNotificationEmail } from "@/utils/emailService";

const ContactUs = () => {
  const prefersReducedMotion = useReducedMotion();
  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    subject: "",
    message: "",
  });

  // Soft expanding rings + linked constellation (same family as About, not homepage waves)
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
    const nodes: Node[] = Array.from({ length: 20 }, (_, i) => ({
      baseAngle: (i / 20) * Math.PI * 2,
      baseDist: 0.1 + (i % 6) * 0.045,
      speed: 0.07 + (i % 5) * 0.018,
      size: 1.3 + (i % 4) * 0.35,
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
      const cx = width * 0.5;
      const cy = height * 0.48;
      const maxR = Math.max(width, height) * 0.58;

      for (let i = 0; i < 5; i++) {
        const phase = (t * 0.16 + i * 0.5) % 1;
        const radius = maxR * (0.18 + phase * 0.82);
        const alpha = (1 - phase) * 0.18;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(93,202,165,${alpha})`;
        ctx.lineWidth = 1.15;
        ctx.stroke();
      }

      const points = nodes.map((node, i) => {
        const angle = node.baseAngle + t * node.speed;
        const breathe = 1 + 0.07 * Math.sin(t * 1.1 + i);
        const dist = height * node.baseDist * breathe;
        return {
          x: cx + Math.cos(angle) * dist * 1.45,
          y: cy + Math.sin(angle) * dist,
          pulse: 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.45 + i)),
          size: node.size,
        };
      });

      const linkDist = Math.min(width, height) * 0.15;
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const d = Math.hypot(dx, dy);
          if (d < linkDist) {
            const alpha = (1 - d / linkDist) * 0.2;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.strokeStyle = `rgba(51,192,138,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + p.pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(29,158,117,${0.18 + p.pulse * 0.26})`;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("contact_submissions")
        .insert([
          {
            name: formData.name,
            email: formData.email,
            company: formData.company || null,
            phone: formData.phone || null,
            subject: formData.subject,
            message: formData.message,
            status: "new",
          },
        ])
        .select();

      if (error) {
        console.error("Error storing contact submission:", error);
        setErrorMessage(error.message || "Failed to store submission");
        setSubmitStatus("error");
      } else {
        const emailResult = await sendContactNotificationEmail({
          name: formData.name,
          email: formData.email,
          company: formData.company || undefined,
          phone: formData.phone || undefined,
          subject: formData.subject,
          message: formData.message,
        });

        if (!emailResult.success) {
          console.warn("Contact submission saved but email notification failed:", emailResult.error);
        }

        console.log("Submission successful:", data);
        setSubmitStatus("success");
        setFormData({
          name: "",
          email: "",
          company: "",
          phone: "",
          subject: "",
          message: "",
        });
      }
    } catch (error) {
      console.error("Contact submission failed:", error);
      setErrorMessage("Network error or database connection failed");
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const headlineLead = "Let's Build a Sustainable".split(" ");
  const wordContainer = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.07, delayChildren: 0.12 },
    },
  };
  const wordReveal = {
    hidden: { opacity: 0, y: 18, filter: "blur(10px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  const fadeUp = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 22 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  };

  const fieldClass =
    "h-11 rounded-xl border-[#D5E5DD] bg-white text-[#0A4D3E] placeholder:text-[#7A958B] focus-visible:ring-[#1D9E75]/35 sm:h-12";

  const officeHours = [
    {
      icon: Clock,
      title: "Monday - Friday",
      value: "9:00 AM - 6:00 PM",
      note: "Eastern Standard Time",
    },
    {
      icon: Globe,
      title: "Weekend Support",
      value: "10:00 AM - 4:00 PM",
      note: "Saturday Only",
    },
    {
      icon: MessageSquare,
      title: "Response Time",
      value: "Within 24 Hours",
      note: "For all inquiries",
    },
  ];

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#F8FCFA]"
      style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
    >
      <MainHeader />

      {/* Hero */}
      <section className="relative flex min-h-[58vh] items-center overflow-hidden bg-[#0a1a1d] pt-28 pb-16 sm:min-h-[64vh] sm:pt-32 sm:pb-20">
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
              "radial-gradient(95% 75% at 50% 40%, rgba(29,158,117,0.14) 0%, rgba(10,26,29,0) 55%), linear-gradient(to bottom, rgba(10,26,29,0.25) 0%, rgba(10,26,29,0) 40%, rgba(10,26,29,0.75) 100%)",
          }}
        />

        {!prefersReducedMotion && (
          <>
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-[8%] top-[30%] h-36 w-36 rounded-full border border-white/10"
              animate={{ y: [0, -16, 0], opacity: [0.25, 0.48, 0.25], scale: [1, 1.05, 1] }}
              transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute right-[10%] top-[24%] h-48 w-48 rounded-full border border-[#33C08A]/15"
              animate={{ y: [0, 18, 0], opacity: [0.2, 0.4, 0.2], rotate: [0, 10, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

        <div className="container relative z-10 mx-auto px-4 sm:px-6 text-center">
          <motion.p
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-5 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#9FE1CB] sm:text-xs"
          >
            Get in Touch
          </motion.p>

          <motion.h1
            variants={prefersReducedMotion ? undefined : wordContainer}
            initial={prefersReducedMotion ? undefined : "hidden"}
            animate={prefersReducedMotion ? undefined : "show"}
            className="mx-auto max-w-4xl overflow-visible text-3xl font-semibold leading-[1.25] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl"
          >
            {headlineLead.map((word, i) => (
              <motion.span
                key={`lead-${i}`}
                variants={prefersReducedMotion ? undefined : wordReveal}
                className="inline-block whitespace-pre"
              >
                {word}{" "}
              </motion.span>
            ))}
            <motion.span
              variants={prefersReducedMotion ? undefined : wordReveal}
              className="hero-shimmer mt-1 inline-block bg-gradient-to-r from-[#33C08A] via-[#DFFBEF] to-[#33C08A] bg-clip-text pb-[0.18em] text-transparent"
            >
              Future Together
            </motion.span>
          </motion.h1>

          <motion.p
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.55, ease: "easeOut" }}
            className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-white/70 sm:text-lg md:text-xl"
          >
            Ready to transform your carbon strategy? Our team is here to help you accelerate your sustainability journey.
          </motion.p>
        </div>
      </section>

      {/* Contact form */}
      <section className="relative z-10 -mt-10 pb-16 sm:-mt-14 sm:pb-20">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            {...fadeUp}
            className="mx-auto max-w-2xl overflow-hidden rounded-[28px] border border-[#DCEAE2] bg-white shadow-[0_24px_60px_-28px_rgba(12,77,62,0.35)]"
          >
            <div className="border-b border-[#E6F0EB] bg-[#F7F4EE]/60 px-6 py-8 text-center sm:px-10 sm:py-10">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">
                Contact form
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-[#0A4D3E] sm:text-3xl">
                Get Started Today
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#4E6C63] sm:text-base">
                Tell us about your carbon management needs and we'll help you find the perfect solution.
              </p>
            </div>

            <div className="p-6 sm:p-8 md:p-10">
              {submitStatus === "success" && (
                <div className="mb-6 rounded-2xl border border-[#B7E4D1] bg-[#EEF9F3] p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#1D9E75]" />
                    <p className="text-sm font-medium text-[#0A4D3E] sm:text-base">
                      Message sent successfully! We'll get back to you within 24 hours.
                    </p>
                  </div>
                </div>
              )}

              {submitStatus === "error" && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-800 sm:text-base">Failed to send message.</p>
                      {errorMessage && (
                        <p className="mt-1 text-xs text-red-600 sm:text-sm">{errorMessage}</p>
                      )}
                      <p className="mt-1 text-xs text-red-600 sm:text-sm">
                        Please try again or contact us directly at info@rethinkcarbon.com
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-[#0A4D3E]">
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className={fieldClass}
                      placeholder="Enter your full name"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-[#0A4D3E]">
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className={fieldClass}
                      placeholder="Enter your email"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-sm font-medium text-[#0A4D3E]">
                      Company
                    </Label>
                    <Input
                      id="company"
                      name="company"
                      type="text"
                      value={formData.company}
                      onChange={handleChange}
                      className={fieldClass}
                      placeholder="Enter your company name"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-[#0A4D3E]">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className={fieldClass}
                      placeholder="Enter your phone number"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-sm font-medium text-[#0A4D3E]">
                    Subject *
                  </Label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder="What can we help you with?"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium text-[#0A4D3E]">
                    Message *
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    value={formData.message}
                    onChange={handleChange}
                    className="min-h-[130px] rounded-xl border-[#D5E5DD] bg-white text-[#0A4D3E] placeholder:text-[#7A958B] focus-visible:ring-[#1D9E75]/35 sm:min-h-[150px]"
                    placeholder="Tell us about your carbon management needs..."
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="group h-12 w-full rounded-full bg-[#1D9E75] text-base font-semibold text-[#04342C] shadow-[0_14px_40px_-12px_rgba(29,158,117,0.55)] hover:bg-[#22B87E] disabled:opacity-50 sm:h-14 sm:text-lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-[#04342C]/30 border-t-[#04342C]" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Send Message
                      <ArrowRight className="ml-1 h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Office hours */}
      <section className="bg-[#F8FCFA] py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
            <motion.div {...fadeUp} className="lg:sticky lg:top-28">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">
                Office Hours
              </p>
              <h2 className="mb-4 text-3xl font-semibold tracking-tight text-[#0A4D3E] sm:text-4xl">
                When We're Available
              </h2>
              <p className="max-w-md text-base leading-relaxed text-[#4E6C63] sm:text-lg">
                Our team is ready to help you during these hours.
              </p>
            </motion.div>

            <div className="relative border-l border-[#1D9E75]/25 pl-8 sm:pl-10">
              {officeHours.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    initial={prefersReducedMotion ? undefined : { opacity: 0, x: 16 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="relative py-6 first:pt-0 last:pb-0 sm:py-7"
                  >
                    <span
                      aria-hidden
                      className="absolute -left-8 top-7 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-[#1D9E75]/40 bg-[#F8FCFA] text-[#1D9E75] sm:-left-10 sm:top-8 sm:h-8 sm:w-8"
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1D9E75]">
                      {item.title}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-[#0A4D3E] sm:text-3xl">
                      {item.value}
                    </p>
                    <p className="mt-1.5 text-sm text-[#4E6C63] sm:text-base">{item.note}</p>
                    {index < officeHours.length - 1 && (
                      <div aria-hidden className="absolute bottom-0 left-0 right-0 h-px bg-[#DCEAE2]" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#EEF4F1] py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            {...fadeUp}
            className="relative overflow-hidden rounded-[30px] border border-[#2F8F6D]/30 bg-[linear-gradient(140deg,#0A4D3E_0%,#11684E_52%,#22B87E_100%)] px-6 py-14 text-center text-white shadow-[0_18px_45px_rgba(10,77,62,0.30)] sm:px-10 md:py-16"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full border border-white/20"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute right-10 top-8 h-20 w-20 rotate-45 border border-white/18"
            />
            <h2 className="relative z-10 mb-4 text-2xl font-semibold sm:text-3xl md:text-4xl">
              Ready to Start Your Carbon Journey?
            </h2>
            <p className="relative z-10 mx-auto mb-8 max-w-3xl text-base text-[#E6F6EF] sm:text-lg">
              Join thousands of organizations already using ReThink Carbon to accelerate their sustainability goals.
            </p>
            <div className="relative z-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button
                size="lg"
                className="rounded-full bg-[#124740] px-8 py-6 font-semibold text-white hover:bg-[#0F3B35]"
                asChild
              >
                <Link to="/pricing">
                  View Pricing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 bg-transparent px-8 py-6 font-semibold text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link to="/about">About Us</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ContactUs;
