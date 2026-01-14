import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  Building2,
  UserPlus,
  Clock,
  AlertCircle,
  LogIn,
  User,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvitationDetails {
  id: string;
  email: string;
  organization_id: string;
  organization_name: string;
  role: string;
  expires_at: string;
  status: string;
  invited_by: string;
  inviter_name?: string;
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { refreshOrganizations } = useOrganization();
  const { toast } = useToast();

  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailMatch, setEmailMatch] = useState<boolean>(false);

  useEffect(() => {
    if (token) {
      validateInvitation();
    } else {
      setError('Invalid invitation link. No token provided.');
      setLoading(false);
    }
  }, [token, user]);

  const validateInvitation = async () => {
    if (!token) {
      setError('Invalid invitation link.');
      setLoading(false);
      return;
    }

    try {
      // Fetch invitation details
      const { data: invitationData, error: invitationError } = await (supabase as any)
        .from('organization_invitations')
        .select(`
          id,
          email,
          organization_id,
          role,
          expires_at,
          status,
          invited_by,
          organizations (
            name
          )
        `)
        .eq('token', token)
        .single();

      if (invitationError || !invitationData) {
        setError('Invalid or expired invitation link.');
        setLoading(false);
        return;
      }

      // Check if invitation is expired
      const expiresAt = new Date(invitationData.expires_at);
      if (expiresAt < new Date()) {
        setError('This invitation has expired.');
        setLoading(false);
        return;
      }

      // Check if invitation is already accepted
      if (invitationData.status !== 'pending') {
        setError(
          invitationData.status === 'accepted'
            ? 'This invitation has already been accepted.'
            : 'This invitation is no longer valid.'
        );
        setLoading(false);
        return;
      }

      // Get inviter's name
      let inviterName = 'Team';
      if (invitationData.invited_by) {
        const { data: inviterProfile } = await (supabase as any)
          .from('profiles')
          .select('display_name')
          .eq('user_id', invitationData.invited_by)
          .single();
        inviterName = inviterProfile?.display_name || 'Team';
      }

      const invitationDetails: InvitationDetails = {
        id: invitationData.id,
        email: invitationData.email,
        organization_id: invitationData.organizations.id,
        organization_name: invitationData.organizations.name,
        role: invitationData.role,
        expires_at: invitationData.expires_at,
        status: invitationData.status,
        invited_by: invitationData.invited_by,
        inviter_name: inviterName,
      };

      setInvitation(invitationDetails);

      // Check if user is logged in and email matches
      if (user) {
        const userEmail = user.email?.toLowerCase();
        const invitationEmail = invitationData.email.toLowerCase();
        setEmailMatch(userEmail === invitationEmail);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error validating invitation:', err);
      setError('Failed to validate invitation. Please try again.');
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!token || !user) {
      setError('You must be logged in to accept this invitation.');
      return;
    }

    if (!emailMatch) {
      setError('The email address of your account does not match the invitation email.');
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      // Call the RPC function to accept the invitation
      const { data, error: acceptError } = await (supabase as any)
        .rpc('accept_organization_invitation', {
          invitation_token: token,
        });

      if (acceptError) {
        throw acceptError;
      }

      if (!data || data.length === 0 || !data[0].success) {
        throw new Error(data?.[0]?.message || 'Failed to accept invitation');
      }

      // Refresh organizations to get the new one
      await refreshOrganizations();

      toast({
        title: 'Invitation accepted!',
        description: `You've been added to ${invitation?.organization_name}.`,
      });

      // Redirect to dashboard or organization management
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setError(err.message || 'Failed to accept invitation. Please try again.');
      setAccepting(false);
    }
  };

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, { label: string; description: string }> = {
      admin: { label: 'Administrator', description: 'Full access to all features' },
      user: { label: 'User', description: 'Can create and edit projects' },
      editor: { label: 'Editor', description: 'Can edit existing projects' },
      viewer: { label: 'Viewer', description: 'Read-only access' },
    };
    return roleMap[role] || { label: role, description: '' };
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-12 w-12 rounded-full mx-auto" />
              <Skeleton className="h-6 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3 mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" asChild>
              <Link to="/login">Go to Login</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/">Go to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const roleInfo = getRoleDisplay(invitation.role);
  const expiresAt = new Date(invitation.expires_at);
  const isExpired = expiresAt < new Date();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-md animate-in slide-in-from-bottom duration-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Mail className="h-12 w-12 text-primary" />
              {invitation.status === 'pending' && !isExpired && (
                <UserPlus className="h-6 w-6 text-green-500 absolute -top-1 -right-1" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl">Organization Invitation</CardTitle>
          <CardDescription>
            You've been invited to join an organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{invitation.organization_name}</p>
                <p className="text-sm text-muted-foreground">
                  Invited by {invitation.inviter_name}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Role: {roleInfo.label}</p>
                <p className="text-xs text-muted-foreground">{roleInfo.description}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">Email:</span> {invitation.email}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">Expires:</span>{' '}
                  {expiresAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {!user && (
            <Alert>
              <LogIn className="h-4 w-4" />
              <AlertDescription>
                Please log in with the email address <strong>{invitation.email}</strong> to accept this invitation.
              </AlertDescription>
            </Alert>
          )}

          {user && !emailMatch && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your account email ({user.email}) does not match the invitation email ({invitation.email}).
                Please log in with the correct account or contact the organization administrator.
              </AlertDescription>
            </Alert>
          )}

          {user && emailMatch && invitation.status === 'pending' && !isExpired && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                You're logged in as {user.email}. Click the button below to accept this invitation.
              </AlertDescription>
            </Alert>
          )}

          {isExpired && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                This invitation has expired. Please request a new invitation from the organization administrator.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {!user ? (
              <>
                <Button className="w-full" asChild>
                  <Link to={`/login?redirect=${encodeURIComponent(`/accept-invitation?token=${token}`)}`}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Log In to Accept
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/register?redirect=${encodeURIComponent(`/accept-invitation?token=${token}`)}`}>
                    Create Account
                  </Link>
                </Button>
              </>
            ) : emailMatch && invitation.status === 'pending' && !isExpired ? (
              <Button
                className="w-full"
                onClick={handleAcceptInvitation}
                disabled={accepting}
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept Invitation
                  </>
                )}
              </Button>
            ) : null}

            <Button variant="outline" className="w-full" asChild>
              <Link to="/">Go to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

