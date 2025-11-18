import Landing from "./Landing";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { isCompanyUser } from "@/utils/roleUtils";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect authenticated users based on their role
  if (user) {
    if (isCompanyUser(user)) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/explore" replace />;
    }
  }

  return <Landing />;
};

export default Index;
