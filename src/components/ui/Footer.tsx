import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const FlagIcon = ({ country }: { country: 'pakistan' | 'uae' }) => (
  <span
    className="relative inline-block h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-white/20"
    aria-hidden
  >
    {country === 'pakistan' ? (
      <>
        <span className="absolute inset-0 bg-[#0a8f49]" />
        <span className="absolute inset-y-0 left-0 w-[26%] bg-white" />
        <span className="absolute left-[46%] top-[28%] h-3.5 w-3.5 rounded-full bg-white" />
        <span className="absolute left-[50%] top-[28%] h-3.5 w-3.5 rounded-full bg-[#0a8f49]" />
        <span className="absolute left-[58%] top-[34%] text-[7px] leading-none text-white">★</span>
      </>
    ) : (
      <>
        <span className="absolute inset-y-0 left-0 w-[28%] bg-[#ef2d2d]" />
        <span className="absolute inset-y-0 right-0 w-[72%] bg-gradient-to-b from-[#1f9f52] via-white to-black" />
      </>
    )}
  </span>
);

const FlagBadge = ({ country, label }: { country: 'pakistan' | 'uae'; label: string }) => (
  <div className="flex items-center gap-3">
    <FlagIcon country={country} />
    <span className="text-gray-300 text-[17px] leading-none">{label}</span>
  </div>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2 flex justify-start">
            <div className="flex w-full flex-col items-start">
              <div className="flex items-center mb-4">
              <div className="h-12 w-20 md:h-16 md:w-28 overflow-hidden relative mr-3">
                <img
                  src="/new_logo.png"
                  alt="Rethink Carbon Logo"
                  className="absolute inset-0 w-full h-full object-contain scale-[3.0] origin-left -translate-x-7 md:-translate-x-9"
                />
              </div>
              <h3 className="text-xl font-bold text-white">Rethink Carbon</h3>
              </div>
              <a
                href="https://www.linkedin.com/company/rethink-carbon-io/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 ml-[15%] inline-flex self-start items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-gray-200 text-[16px] hover:border-teal-400 hover:text-teal-300 transition-colors"
              >
                <LinkedInIcon className="h-5 w-5" />
                Join us on LinkedIn
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xl font-semibold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 text-[18px] hover:text-teal-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/explore" className="text-gray-300 text-[18px] hover:text-teal-400 transition-colors">
                  Explore
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-gray-300 text-[18px] hover:text-teal-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="text-gray-300 text-[18px] hover:text-teal-400 transition-colors">
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <Link to="/data-consent" className="text-gray-300 text-[18px] hover:text-teal-400 transition-colors">
                  Data Consent
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-xl font-semibold mb-4 text-white">Contact</h4>
            <ul className="space-y-2">
              <li className="flex items-center text-gray-300 text-[18px]">
                <Mail className="h-4 w-4 mr-2 text-teal-400" />
                <a href="mailto:connect@rethinkcarbon.io" className="hover:text-teal-400 transition-colors">
                  connect@rethinkcarbon.io
                </a>
              </li>
              <li className="flex items-center text-gray-300 text-[18px]">
                <Phone className="h-4 w-4 mr-2 text-teal-400" />
                <a href="tel:+923325473514" className="hover:text-teal-400 transition-colors">
                  +92 (332) 5473514
                </a>
              </li>
            </ul>

            <div className="mt-7">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-400">
                Global Presence
              </p>
              <div className="space-y-3">
                <FlagBadge country="pakistan" label="Pakistan" />
                <FlagBadge country="uae" label="United Arab Emirates" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-gray-400 text-[15px]">
                © {currentYear} Rethink Carbon. All rights reserved.
              </p>
              <p className="text-gray-500 text-[14px] mt-1">Powered by AWS</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 md:justify-end">
              <Link to="/privacy-policy" className="text-gray-400 hover:text-teal-400 text-[15px] transition-colors">Privacy Policy</Link>
              <Link to="/terms-and-conditions" className="text-gray-400 hover:text-teal-400 text-[15px] transition-colors">Terms and Conditions</Link>
              <Link to="/data-consent" className="text-gray-400 hover:text-teal-400 text-[15px] transition-colors">Data Consent</Link>
              <a href="#" className="text-gray-400 hover:text-teal-400 text-[15px] transition-colors">
                FAQ's
              </a>
              <a href="#" className="text-gray-400 hover:text-teal-400 text-[15px] transition-colors">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
