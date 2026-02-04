import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const MainHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);
  const [solutionsOpenedByClick, setSolutionsOpenedByClick] = useState(false);
  const solutionsRef = useRef<HTMLDivElement | null>(null);
  const hoverCloseTimer = useRef<number | null>(null);
  const location = useLocation();
  const isHome = location.pathname === "/";

  // Close Solutions dropdown on outside click when opened by click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!solutionsOpen) return;
      const target = e.target as Node;
      if (solutionsRef.current && !solutionsRef.current.contains(target)) {
        setSolutionsOpen(false);
        setSolutionsOpenedByClick(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [solutionsOpen]);

  // Home: glass-rounded pill; other pages: standard white header
  const headerClass = isHome
    ? "mx-3 my-2 rounded-[32px] bg-white/14 backdrop-blur-2xl border border-white/40 shadow-[0_18px_68px_-34px_rgba(0,0,0,0.55)]"
    : "bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm";

  const navLinkClass = "transition-colors duration-300 text-gray-700 hover:text-teal-600";
  const buttonTextClass = "text-gray-900";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerClass}`}
    >
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="h-10 md:h-14 flex items-center">
            <img
              src="/logoo.png"
              alt="ReThink Carbon Logo"
              className="h-10 md:h-14 w-auto object-contain"
            />
          </div>
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
              <div className="absolute left-0 mt-3 w-80 rounded-xl bg-white shadow-xl py-2 z-50 overflow-hidden border border-gray-200">
                <Link
                  to="/solutions/corporate"
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-teal-600 hover:text-white transition-colors"
                >
                  Carbon Intelligence for Corporates
                </Link>
                <Link
                  to="/solutions/financial-institutions"
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-teal-600 hover:text-white transition-colors"
                >
                  Carbon Intelligence for Financial Institutions
                </Link>
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
          
          <Link
            to="/contact"
            className={navLinkClass}
          >
            Contact
          </Link>
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex space-x-4">
          <Button variant="ghost" asChild>
            <Link to="/login" className={buttonTextClass}>Login</Link>
          </Button>
          <Button
            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
            asChild
          >
            <Link to="/contact">Contact Us</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-gray-600 hover:text-teal-600 transition-colors"
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Menu */}
      <div className={`md:hidden fixed top-0 right-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
        isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <span className="font-semibold text-gray-900">Menu</span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-gray-600 hover:text-teal-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Navigation Links */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              <a
                href="/"
                className="flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </a>
              <Link
                to="/about"
                className="flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </Link>
              {/* Mobile Solutions accordion */}
              <div className="border rounded-lg">
                <button
                  className="w-full flex items-center justify-between p-3 text-left text-gray-600 hover:bg-gray-100"
                  onClick={() => setMobileSolutionsOpen(v => !v)}
                >
                  <span>Solutions</span>
                  <svg className={`h-4 w-4 transition-transform ${mobileSolutionsOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.085l3.71-3.855a.75.75 0 111.08 1.04l-4.24 4.404a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                {mobileSolutionsOpen && (
                  <div className="px-2 pb-2">
                    <Link
                      to="/solutions/corporate"
                      className="block p-2 rounded text-sm text-gray-600 hover:bg-gray-100"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Carbon Intelligence for corporates
                    </Link>
                    <Link
                      to="/solutions/financial-institutions"
                      className="block p-2 rounded text-sm text-gray-600 hover:bg-gray-100"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Carbon Intelligence for financial institutions
                    </Link>
                  </div>
                )}
              </div>
              <Link
                to="/pricing"
                className="flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                to="/contact"
                className="flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </Link>
            </div>
          </nav>

          {/* Mobile Auth Buttons */}
          <div className="p-4 border-t border-gray-200 space-y-3">
            <Button variant="outline" className="w-full" asChild>
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
            </Button>
            <Button
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
              asChild
            >
              <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)}>Contact Us</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MainHeader;
