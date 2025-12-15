import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import MainHeader from "@/components/ui/MainHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Register = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    organizationName: "",
    phone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Get user_type from query params, default to 'financial_institution'
  const userType = searchParams.get('user_type') || 'financial_institution';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    
    try {
      // Step 1: Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });
      
      if (error) {
        setLoading(false);
        toast({
          title: "Error creating account",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      const user = data?.user;
      if (!user) {
        setLoading(false);
        toast({
          title: "Error",
          description: "User account was not created. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Use RPC function to create organization and profile
      // This bypasses RLS issues during signup when session might not be fully established
      const orgName = formData.organizationName || formData.email.split('@')[1]?.split('.')[0] || 'My Organization';
      const displayName = formData.displayName || formData.email.split('@')[0];
      
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc('create_organization_for_user', {
        p_user_id: user.id,
        p_organization_name: orgName,
        p_display_name: displayName,
        p_phone: formData.phone || null,
        p_user_type: userType,
      });

      if (rpcError) {
        console.error('Error creating organization via RPC:', rpcError);
        toast({
          title: "Organization error",
          description: rpcError.message || "Failed to create organization. Please contact support.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!rpcData || (rpcData as any).success !== true) {
        console.error('RPC function returned error:', rpcData);
        toast({
          title: "Organization error",
          description: (rpcData as any)?.error || "Failed to create organization. Please contact support.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setLoading(false);
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
      navigate("/confirm-email");
    } catch (error: any) {
      console.error('Unexpected error during registration:', error);
      setLoading(false);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <MainHeader />

      <div className="flex items-center justify-center p-4 pt-24">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center ">
              <div className="h-10 w-10 md:h-12 md:w-12 flex items-center justify-center">
                <img
                  src="/logo3.png"
                  alt="ReThink Carbon Logo"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>
              Join ReThink Carbon to start evaluating carbon credit projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {/* <Label>Organization Name</Label>
              <Input
                name="organizationName"
                type="text"
                value={formData.organizationName}
                onChange={handleInputChange}
                required
              />{" "}
              <Label>Display Name</Label>
              <Input
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleInputChange}
                required
              />
              <Label>Phone Number</Label>
              <Input
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                required
              /> */}
              <Label>Email</Label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <Label>Password</Label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </Button>
              </div>
              <Label>Confirm Password</Label>
              <Input
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
            <div className="mt-4 text-center">
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:underline"
              >
                ← Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
