import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const MainHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);
  const [solutionsOpenedByClick, setSolutionsOpenedByClick] = useState(false);
  const [isInHero, setIsInHero] = useState(true);
  const [sectorPanel, setSectorPanel] = useState<"corporate" | "financial" | null>(null);
  const solutionsRef = useRef<HTMLDivElement | null>(null);
  const hoverCloseTimer = useRef<number | null>(null);
  const sectorPanelTimer = useRef<number | null>(null);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { user } = useAuth();
  const logoTarget = user ? "/dashboard" : "/";

  const clearSectorPanelSoon = () => {
    if (sectorPanelTimer.current) window.clearTimeout(sectorPanelTimer.current);
    sectorPanelTimer.current = window.setTimeout(() => setSectorPanel(null), 120);
  };

  const keepSectorPanel = (panel: "corporate" | "financial") => {
    if (sectorPanelTimer.current) window.clearTimeout(sectorPanelTimer.current);
    setSectorPanel(panel);
  };

  const corporateIndustries = [
    "Oil & Gas",
    "Textile & Manufacturing",
    "Agriculture",
    "Power & Utilities",
    "Mining & Metals",
    "Transport & Logistics",
  ] as const;

  const financialIndustries = [
    "Development institutions",
    "Banks",
    "Insurance",
    "Asset managers",
    "Capital markets",
  ] as const;

  // Close Solutions dropdown on outside click when opened by click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!solutionsOpen) return;
      const target = e.target as Node;
      if (solutionsRef.current && !solutionsRef.current.contains(target)) {
        setSolutionsOpen(false);
        setSolutionsOpenedByClick(false);
        setSectorPanel(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [solutionsOpen]);

  // Home page: keep white nav text only while inside hero viewport
  useEffect(() => {
    if (!isHome) {
      setIsInHero(false);
      return;
    }

    const updateHeroState = () => {
      const heroThreshold = window.innerHeight * 0.78;
      setIsInHero(window.scrollY < heroThreshold);
    };

    updateHeroState();
    window.addEventListener("scroll", updateHeroState);
    window.addEventListener("resize", updateHeroState);

    return () => {
      window.removeEventListener("scroll", updateHeroState);
      window.removeEventListener("resize", updateHeroState);
    };
  }, [isHome]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMobileSolutionsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnDesktop = () => {
      if (window.innerWidth >= 768) setIsMobileMenuOpen(false);
    };
    window.addEventListener("resize", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, [isMobileMenuOpen]);

  // Home: glass in hero; light white bar with dark text after scroll
  const headerClass = isHome
    ? isInHero
      ? "mx-3 my-2 rounded-[32px] bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_16px_44px_-24px_rgba(0,0,0,0.22)]"
      : "mx-3 my-2 rounded-[32px] bg-white/92 backdrop-blur-md border border-gray-200/70 shadow-md"
    : "bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm";

  const navLinkClass = isHome && isInHero
    ? "transition-colors duration-300 text-[14px] lg:text-[16px] font-normal tracking-wide text-gray-800 hover:text-[#0A4D3E]"
    : "transition-colors duration-300 text-[14px] lg:text-[16px] font-normal tracking-wide text-gray-800 hover:text-[#0A4D3E]";
  const buttonTextClass = isHome && isInHero
    ? "text-gray-900 hover:text-[#0A4D3E] text-base lg:text-[17px] font-normal"
    : "text-gray-900 hover:text-[#0A4D3E] text-base lg:text-[17px] font-normal";
  const mobileMenuButtonClass = isHome && isInHero
    ? "md:hidden p-2 text-gray-800 hover:text-[#0A4D3E] transition-colors"
    : "md:hidden p-2 text-gray-800 hover:text-[#0A4D3E] transition-colors";
  const solutionsDropdownClass =
    "fixed left-0 right-0 top-[78px] z-50 border border-gray-200/90 bg-[#EEF1F0] px-6 py-5 shadow-[0_24px_55px_-28px_rgba(0,0,0,0.28)]";
  const solutionsLinkClass =
    "block px-4 py-3 text-sm text-gray-800 hover:bg-[#EAF7F1] hover:text-[#0A4D3E] transition-colors";
  const megaMenuHeadingClass = "text-[20px] lg:text-[24px] font-semibold leading-tight text-[#173A32] mb-3";
  const megaMenuLinkClass = "block py-1.5 text-[14px] lg:text-[15px] font-normal text-[#274C43]/85 hover:text-[#0A4D3E] transition-colors";
  const moduleSolutionLinks = [
    { label: "ESG Management", to: "/solutions/modules/esg" },
    { label: "Carbon Accounting", to: "/solutions/modules/accounting" },
    { label: "Digital MRV", to: "/solutions/modules/mrv" },
    { label: "Carbon Management", to: "/solutions/modules/management" },
    { label: "Climate Risk Analysis", to: "/solutions/modules/risk" },
    { label: "Supply Chain Intelligence", to: "/solutions/modules/supplychain" },
    { label: "AI Carbon Strategist", to: "/solutions/modules/ai" },
    { label: "Carbon Markets", to: "/solutions/modules/markets" },
    { label: "Portfolio Management", to: "/solutions/modules/portfolio" },
  ] as const;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerClass}`}
    >
      <div className="container mx-auto px-4 py-2.5 flex justify-between items-center">
        {/* Logo — same visual size, clipped so it stays inside the rounded nav */}
        <div className="flex items-center shrink-0">
          <Link
            to={logoTarget}
            aria-label="Go to home or dashboard"
            className="flex h-10 w-28 items-center justify-start overflow-hidden focus:outline-none focus-visible:outline-none md:h-12 md:w-36 lg:h-14 lg:w-44"
          >
            <img
              src="/new_logo.png"
              alt="Rethink Carbon Logo"
              className="h-full w-auto max-w-none object-contain origin-left scale-[3.55] -translate-x-8 md:scale-[4.05] md:-translate-x-10 lg:scale-[4.55] lg:-translate-x-13"
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-6">
          <a
            href="/"
            className={navLinkClass}
          >
            Home
          </a>
{/* Solutions dropdown */}
<div
            className="relative"
            ref={solutionsRef}
            onMouseEnter={() => {
              if (hoverCloseTimer.current) {
                window.clearTimeout(hoverCloseTimer.current);
                hoverCloseTimer.current = null;
              }
              setSolutionsOpen(true);
            }}
            onMouseLeave={() => {
              if (solutionsOpenedByClick) return;
              hoverCloseTimer.current = window.setTimeout(() => {
                setSolutionsOpen(false);
                setSectorPanel(null);
              }, 200);
            }}
          >
            <button
              onClick={() => {
                setSolutionsOpen(v => !v);
                setSolutionsOpenedByClick(v => !v ? true : false);
              }}
              className={`${navLinkClass} flex items-center gap-1`}
            >
              Solutions
              <svg className={`h-4 w-4 transition-transform ${solutionsOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.085l3.71-3.855a.75.75 0 111.08 1.04l-4.24 4.404a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {solutionsOpen && (
              <div className={solutionsDropdownClass}>
                <div className="mx-auto grid w-full max-w-[1280px] grid-cols-12 gap-8">
                  <div className="col-span-9 grid grid-cols-4 gap-8">
                    <div>
                      <p className={megaMenuHeadingClass}>Understand and Measure</p>
                      <Link to="/solutions/modules/esg" className={megaMenuLinkClass}>ESG management</Link>
                      <Link to="/solutions/modules/accounting" className={megaMenuLinkClass}>Scope 1, 2 and 3 accounting</Link>
                      <Link to="/solutions/modules/mrv" className={megaMenuLinkClass}>Digital MRV</Link>
                    </div>

                    <div>
                      <p className={megaMenuHeadingClass}>Manage and Mitigate</p>
                      <Link to="/solutions/modules/management" className={megaMenuLinkClass}>Carbon management</Link>
                      <Link to="/solutions/modules/risk" className={megaMenuLinkClass}>Climate risk analysis</Link>
                      <Link to="/solutions/modules/supplychain" className={megaMenuLinkClass}>Supply chain intelligence</Link>
                    </div>

                    <div>
                      <p className={megaMenuHeadingClass}>Act and Optimise</p>
                      <Link to="/solutions/modules/ai" className={megaMenuLinkClass}>AI carbon consultant</Link>
                      <Link to="/solutions/modules/markets" className={megaMenuLinkClass}>Carbon markets</Link>
                      <Link to="/solutions/modules/portfolio" className={megaMenuLinkClass}>Portfolio management</Link>
                    </div>

                    <div>
                      <p className={megaMenuHeadingClass}>Solutions by Industries</p>
                      <Link
                        to="/solutions/corporate"
                        className={megaMenuLinkClass}
                        onMouseEnter={() => keepSectorPanel("corporate")}
                        onMouseLeave={clearSectorPanelSoon}
                      >
                        Corporates
                      </Link>
                      <Link
                        to="/solutions/financial-institutions"
                        className={megaMenuLinkClass}
                        onMouseEnter={() => keepSectorPanel("financial")}
                        onMouseLeave={clearSectorPanelSoon}
                      >
                        Financial institutions
                      </Link>
                    </div>
                  </div>

                  <div
                    className="col-span-3"
                    onMouseEnter={() => {
                      if (sectorPanel) {
                        if (sectorPanelTimer.current) window.clearTimeout(sectorPanelTimer.current);
                      }
                    }}
                    onMouseLeave={clearSectorPanelSoon}
                  >
                    {sectorPanel === "corporate" ? (
                      <div className="rounded-xl bg-[#062D26] p-5 text-white">
                        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#9FE1CB]">
                          Corporate industries
                        </p>
                        <ul className="mt-4 space-y-2.5">
                          {corporateIndustries.map((item) => (
                            <li
                              key={item}
                              className="cursor-default border-b border-white/10 py-2 text-[15px] text-white/85 last:border-b-0"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : sectorPanel === "financial" ? (
                      <div className="rounded-xl bg-[#062D26] p-5 text-white">
                        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#9FE1CB]">
                          Financial segments
                        </p>
                        <ul className="mt-4 space-y-2.5">
                          {financialIndustries.map((item) => (
                            <li
                              key={item}
                              className="cursor-default border-b border-white/10 py-2 text-[15px] text-white/85 last:border-b-0"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-[#062D26] p-5 text-white">
                        <p className="text-xl font-semibold leading-tight">Book a product demo</p>
                        <p className="mt-2 text-sm text-white/75">
                          See Rethink Carbon on your own data with a guided walkthrough.
                        </p>
                        <Button
                          className="mt-4 w-full bg-[#1D9E75] text-white hover:bg-[#168661]"
                          asChild
                        >
                          <Link to="/contact">Book a demo</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link
            to="/about"
            className={navLinkClass}
          >
            About
          </Link>
          
          <Link
            to="/pricing"
            className={navLinkClass}
          >
            Pricing
          </Link>
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex space-x-4">
          <Button variant="ghost" asChild>
            <Link to="/login" className={buttonTextClass}>Login</Link>
          </Button>
          <Button
            className="bg-[#124740] hover:bg-[#0F3B35] text-white font-semibold"
            asChild
          >
            <Link to="/contact">Contact Us</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={mobileMenuButtonClass}
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {isMobileMenuOpen &&
        createPortal(
          <div className="md:hidden fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Menu">
            <button
              type="button"
              className="absolute inset-0 bg-[#041512]/70"
              aria-label="Close menu"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="absolute inset-y-0 right-0 flex h-dvh w-full max-w-sm flex-col bg-white text-gray-900 shadow-[-16px_0_40px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                <span className="font-semibold text-gray-900">Menu</span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-gray-700 hover:text-[#1D9E75] transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto bg-white p-4">
                <div className="space-y-2">
                  <a
                    href="/"
                    className="flex items-center p-3 rounded-lg text-base font-medium text-gray-900 hover:bg-gray-100 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Home
                  </a>
                  <Link
                    to="/about"
                    className="flex items-center p-3 rounded-lg text-base font-medium text-gray-900 hover:bg-gray-100 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    About
                  </Link>
                  <div className="border border-gray-200 rounded-lg bg-white">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 text-left text-base font-medium text-gray-900 hover:bg-gray-100"
                      onClick={() => setMobileSolutionsOpen((v) => !v)}
                    >
                      <span>Solutions</span>
                      <svg className={`h-4 w-4 transition-transform ${mobileSolutionsOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.085l3.71-3.855a.75.75 0 111.08 1.04l-4.24 4.404a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {mobileSolutionsOpen && (
                      <div className="px-2 pb-2">
                        <Link
                          to="/solutions/corporate"
                          className="block p-2 rounded text-[15px] text-gray-800 hover:bg-gray-100"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Carbon Intelligence for corporates
                        </Link>
                        <Link
                          to="/solutions/financial-institutions"
                          className="block p-2 rounded text-[15px] text-gray-800 hover:bg-gray-100"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Carbon Intelligence for financial institutions
                        </Link>
                        <Link
                          to="/solutions/modules/ai"
                          className="block p-2 rounded text-[15px] text-gray-800 hover:bg-gray-100"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Sustainability solution modules
                        </Link>
                        <div className="my-1 border-t border-gray-200" />
                        {moduleSolutionLinks.map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            className="block p-2 rounded text-[15px] text-gray-800 hover:bg-gray-100"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link
                    to="/pricing"
                    className="flex items-center p-3 rounded-lg text-base font-medium text-gray-900 hover:bg-gray-100 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                </div>
              </nav>

              <div className="border-t border-gray-200 bg-white p-4 space-y-3">
                <Button variant="outline" className="w-full bg-white text-gray-900" asChild>
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                </Button>
                <Button
                  className="w-full bg-[#124740] hover:bg-[#0F3B35] text-white font-semibold"
                  asChild
                >
                  <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)}>Contact Us</Link>
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};

export default MainHeader;
