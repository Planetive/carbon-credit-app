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
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
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

      // Create profile with the correct user_type from query params
      // Use a small delay to ensure user is committed to auth.users
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const displayName = formData.displayName || formData.email.split('@')[0];
      
      const { error: profileError } = await (supabase.rpc as any)('create_profile_for_user', {
        p_user_id: user.id,
        p_display_name: displayName,
        p_phone: formData.phone || null,
        p_user_type: userType // Use the user_type from query params
      });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Don't fail the registration if profile creation fails - user can complete it later
        // But log it for debugging
      }

      // Create the original organization with the user's display name
      // Wait a bit more to ensure profile is created
      await new Promise(resolve => setTimeout(resolve, 300));
      
      try {
        const { data: newOrg, error: orgError } = await (supabase as any)
          .from('organizations')
          .insert([
            {
              name: displayName,
              description: null,
              parent_organization_id: null,
              is_original: true, // Mark as original
            },
          ])
          .select()
          .single();

        if (orgError) {
          console.error('Error creating organization:', orgError);
          // Don't fail registration, but log the error
        } else if (newOrg) {
          // The trigger will automatically add the user as admin and set it as current
          // But let's make sure it's set as current organization
          await (supabase as any)
            .from('profiles')
            .update({ current_organization_id: newOrg.id })
            .eq('user_id', user.id);
        }
      } catch (orgErr: any) {
        console.error('Error creating organization during signup:', orgErr);
        // Don't fail registration
      }
      
      setLoading(false);
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
      navigate(`/confirm-email?email=${encodeURIComponent(formData.email)}`);
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
              <Label>Display Name</Label>
              <Input
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleInputChange}
                placeholder="Your name"
                required
              />
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
