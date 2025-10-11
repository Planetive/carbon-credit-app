import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Mail, Phone, MapPin, Github, Twitter, Linkedin } from 'lucide-react';

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
              <div className="h-6 w-6 md:h-12 md:w-12 relative mr-3">
                <img
                  src="/logo3.png"
                  alt="ReThink Carbon Logo"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
              <h3 className="text-xl font-bold text-white">ReThink Carbon</h3>
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              Empowering organizations to make a positive impact through carbon credit projects. 
              Discover, create, and manage sustainable initiatives worldwide.
            </p>
            <div className="flex space-x-4">
            <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-teal-400 transition-colors">
                <Github className="h-5 w-5 text-gray-900" />
              </a>
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-teal-400 transition-colors">
                <Twitter className="h-5 w-5 text-gray-900" />
              </a>
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-teal-400 transition-colors">
                <Linkedin className="h-5 w-5 text-gray-900" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2">
            <li>
                <Link to="/" className="text-gray-300 hover:text-teal-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/explore" className="text-gray-300 hover:text-teal-400 transition-colors">
                  Explore
                </Link>
              </li>
              
              <li>
                <Link to="#" className="text-gray-300 hover:text-teal-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-300 hover:text-teal-400 transition-colors">
                  Terms of service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Contact</h4>
            <ul className="space-y-2">
              <li className="flex items-center text-gray-300">
                <Mail className="h-4 w-4 mr-2 text-teal-400" />
                <a href="mailto:info@rethinkcarbon.com" className="hover:text-teal-400 transition-colors">
                  info@rethinkcarbon.com
                </a>
              </li>
              <li className="flex items-center text-gray-300">
                <Phone className="h-4 w-4 mr-2 text-teal-400" />
                <a href="tel:+923325473514" className="hover:text-teal-400 transition-colors">
                  +92 (332) 5473514
                </a>
              </li>
              <li className="flex items-start text-gray-300">
                <MapPin className="h-4 w-4 mr-2 mt-0.5 text-teal-400" />
                <span>ReThink Carbon<br />Al Hamra Industrial Zone-FZ<br />United Arab Emirates</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {currentYear} ReThink Carbon. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-teal-400 text-sm transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-teal-400 text-sm transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-gray-400 hover:text-teal-400 text-sm transition-colors">
                FAQ's
              </a>
              <a href="#" className="text-gray-400 hover:text-teal-400 text-sm transition-colors">
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