import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, X } from 'lucide-react';

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              {/* <Leaf className="h-8 w-8 text-teal-400 mr-3" /> */}
              <div className="h-12 w-20 md:h-16 md:w-28 overflow-hidden relative mr-3">
                <img
                  src="/new_logo.png"
                  alt="Rethink Carbon Logo"
                  className="absolute inset-0 w-full h-full object-contain scale-[3.0] origin-left -translate-x-7 md:-translate-x-9"
                />
              </div>
              <h3 className="text-xl font-bold text-white">Rethink Carbon</h3>
            </div>
            <p className="text-gray-300 text-[18px] mb-4 max-w-md">
              Empowering organizations to make a positive impact through carbon credit projects. 
              Discover, create, and manage sustainable initiatives worldwide.
            </p>
            <div className="flex space-x-4">
              <a
                href="mailto:connect@rethinkcarbon.io"
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-teal-400 transition-colors"
              >
                <Mail className="h-5 w-5 text-gray-900" />
              </a>
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-teal-400 transition-colors">
                <X className="h-5 w-5 text-gray-900" />
              </a>
              <a
                href="https://www.linkedin.com/company/rethink-carbon-io/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-teal-400 transition-colors"
              >
                <LinkedInIcon className="h-5 w-5 text-gray-900" />
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
              <li className="flex items-start text-gray-300 text-[18px]">
                <MapPin className="h-4 w-4 mr-2 mt-0.5 text-teal-400" />
                <span>Rethink Carbon<br />Al Hamra Industrial Zone-FZ<br />United Arab Emirates</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-[15px]">
              © {currentYear} Rethink Carbon. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
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