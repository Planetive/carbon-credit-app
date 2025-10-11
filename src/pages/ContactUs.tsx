import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MainHeader from "@/components/ui/MainHeader";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  Users,
  Globe,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ContactUs = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Handle scroll to change header background
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      console.log('Submitting form data:', formData);

      // Store submission in Supabase
      const { data, error } = await supabase
        .from('contact_submissions')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            company: formData.company || null,
            phone: formData.phone || null,
            subject: formData.subject,
            message: formData.message,
            status: 'new'
          }
        ])
        .select();

      if (error) {
        console.error('Error storing contact submission:', error);
        setErrorMessage(error.message || 'Failed to store submission');
        setSubmitStatus('error');
      } else {
        console.log('Submission successful:', data);
        setSubmitStatus('success');
        // Reset form
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
      console.error('Contact submission failed:', error);
      setErrorMessage('Network error or database connection failed');
      setSubmitStatus('error');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <MainHeader />

      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 md:py-20 pt-24 sm:pt-28 md:pt-32 bg-gradient-to-br from-teal-600 to-cyan-700 text-white">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <Badge className="mb-4 sm:mb-6 bg-white/20 text-white border border-white/30">
            Get in Touch
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
            Let's Build a Sustainable
            <span className="block text-teal-200">Future Together</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-teal-100 mb-6 sm:mb-8 max-w-4xl mx-auto leading-relaxed px-4">
            Ready to transform your carbon strategy? Our team is here to help you accelerate your sustainability journey.
          </p>
        </div>
      </section>

      {/* Contact Form - Centered */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-2xl border-0 bg-gradient-to-br from-white to-gray-50">
              <CardHeader className="text-center pb-6 sm:pb-8">
                <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-gray-900">
                  Get Started Today
                </CardTitle>
                <p className="text-base sm:text-lg text-gray-600">
                  Tell us about your carbon management needs and we'll help you find the perfect solution.
                </p>
              </CardHeader>
              
              <CardContent className="p-6 sm:p-8">
                {/* Success/Error Messages */}
                {submitStatus === 'success' && (
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2" />
                      <p className="text-green-800 font-medium text-sm sm:text-base">Message sent successfully! We'll get back to you within 24 hours.</p>
                    </div>
                  </div>
                )}
                
                {submitStatus === 'error' && (
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mr-2" />
                      <div>
                        <p className="text-red-800 font-medium text-sm sm:text-base">Failed to send message.</p>
                        {errorMessage && (
                          <p className="text-red-600 text-xs sm:text-sm mt-1">{errorMessage}</p>
                        )}
                        <p className="text-red-600 text-xs sm:text-sm mt-1">Please try again or contact us directly at info@rethinkcarbon.com</p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-700 font-medium text-sm sm:text-base">
                        Full Name *
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="h-10 sm:h-12 border-gray-300 focus:border-teal-500 focus:ring-teal-500 text-sm sm:text-base"
                        placeholder="Enter your full name"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-700 font-medium text-sm sm:text-base">
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="h-10 sm:h-12 border-gray-300 focus:border-teal-500 focus:ring-teal-500 text-sm sm:text-base"
                        placeholder="Enter your email"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-gray-700 font-medium text-sm sm:text-base">
                        Company
                      </Label>
                      <Input
                        id="company"
                        name="company"
                        type="text"
                        value={formData.company}
                        onChange={handleChange}
                        className="h-10 sm:h-12 border-gray-300 focus:border-teal-500 focus:ring-teal-500 text-sm sm:text-base"
                        placeholder="Enter your company name"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-700 font-medium text-sm sm:text-base">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        className="h-10 sm:h-12 border-gray-300 focus:border-teal-500 focus:ring-teal-500 text-sm sm:text-base"
                        placeholder="Enter your phone number"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-gray-700 font-medium text-sm sm:text-base">
                      Subject *
                    </Label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="h-10 sm:h-12 border-gray-300 focus:border-teal-500 focus:ring-teal-500 text-sm sm:text-base"
                      placeholder="What can we help you with?"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-gray-700 font-medium text-sm sm:text-base">
                      Message *
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      value={formData.message}
                      onChange={handleChange}
                      className="min-h-[120px] sm:min-h-[140px] border-gray-300 focus:border-teal-500 focus:ring-teal-500 resize-none text-sm sm:text-base"
                      placeholder="Tell us about your carbon management needs..."
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={isSubmitting}
                    className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Office Hours */}
      <section className="py-12 sm:py-16 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-3 sm:mb-4 bg-teal-100 text-teal-800">Office Hours</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-gray-900">
              When We're Available
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-12 px-4">
              Our team is ready to help you during these hours.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Clock className="h-10 w-10 sm:h-12 sm:w-12 text-teal-600 mx-auto mb-3 sm:mb-4" />
                  <CardTitle className="text-base sm:text-lg">Monday - Friday</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl sm:text-2xl font-bold text-teal-600 mb-2">9:00 AM - 6:00 PM</p>
                  <p className="text-sm sm:text-base text-gray-600">Eastern Standard Time</p>
                </CardContent>
              </Card>
              
              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Globe className="h-10 w-10 sm:h-12 sm:w-12 text-teal-600 mx-auto mb-3 sm:mb-4" />
                  <CardTitle className="text-base sm:text-lg">Weekend Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl sm:text-2xl font-bold text-teal-600 mb-2">10:00 AM - 4:00 PM</p>
                  <p className="text-sm sm:text-base text-gray-600">Saturday Only</p>
                </CardContent>
              </Card>
              
              <Card className="text-center hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
                <CardHeader>
                  <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-teal-600 mx-auto mb-3 sm:mb-4" />
                  <CardTitle className="text-base sm:text-lg">Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl sm:text-2xl font-bold text-teal-600 mb-2">Within 24 Hours</p>
                  <p className="text-sm sm:text-base text-gray-600">For all inquiries</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-teal-600 to-cyan-700 text-white">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
            Ready to Start Your Carbon Journey?
          </h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 max-w-3xl mx-auto opacity-90 px-4">
            Join thousands of organizations already using ReThink Carbon to accelerate their sustainability goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              variant="secondary"
              className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-6 w-full sm:w-auto"
              asChild
            >
              <Link to="/register">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-6 border-white text-white text-teal-600 w-full sm:w-auto"
              asChild
            >
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactUs; 