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
    // if (
    //   !formData.organizationName ||
    //   !formData.displayName ||
    //   !formData.phone
    // ) {
    //   toast({
    //     title: "Missing fields",
    //     description:
    //       "Organization name, display name, and phone number are required.",
    //     variant: "destructive",
    //   });
    //   return;
    // }
    setLoading(true);
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
    // Insert into profiles table
    const user = data?.user;
    if (user) {
      const { error: profileError } = await (supabase as any)
        .from("profiles")
        .insert([
          {
            user_id: user.id,
            organization_name: formData.organizationName,
            display_name: formData.displayName,
            phone: formData.phone,
            user_type: userType, // Save user_type from query params
          },
        ]);
      if (profileError) {
        toast({
          title: "Profile error",
          description: profileError.message,
          variant: "destructive",
        });
      }
    }
    setLoading(false);
    toast({
      title: "Account created!",
      description: "Please check your email to verify your account.",
    });
    navigate("/confirm-email");
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
