import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Mail, CheckCircle } from "lucide-react";

const ConfirmEmail = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Mail className="h-12 w-12 text-primary" />
              <CheckCircle className="h-6 w-6 text-green-500 absolute -top-1 -right-1" />
            </div>
          </div>
          <CardTitle className="text-2xl">Confirm Your Email</CardTitle>
          <CardDescription>
            We've sent a confirmation email to your inbox
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Please check your email and click the verification link to activate your account.
            </p>
            <p className="text-sm text-muted-foreground">
              Don't see the email? Check your spam folder or request a new one.
            </p>
          </div>

          <div className="space-y-3">
            <Button className="w-full">
              Resend Confirmation Email
            </Button>
            
            <Button variant="outline" className="w-full" asChild>
              <Link to="/login">
                Continue to Login
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Having trouble? <Link to="/support" className="text-primary hover:underline">Contact support</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmail;