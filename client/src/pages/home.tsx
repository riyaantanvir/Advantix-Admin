import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { LogOut, User, Shield } from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Get user from localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("authToken");
      const response = await apiRequest("POST", "/api/auth/logout", {});
      return response.json();
    },
    onSuccess: () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      
      // Dispatch custom event to notify auth state change
      window.dispatchEvent(new Event("auth-change"));
      
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of Advantix Admin.",
      });
      
      setTimeout(() => {
        setLocation("/login");
      }, 1000);
    },
    onError: () => {
      // Even if logout fails on server, clear local storage
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      
      // Dispatch custom event to notify auth state change
      window.dispatchEvent(new Event("auth-change"));
      
      setLocation("/login");
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Advantix Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back, {user?.username || "Admin"}!
            </p>
          </div>
          
          <Button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            variant="outline"
            className="flex items-center gap-2"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            {logoutMutation.isPending ? "Signing out..." : "Logout"}
          </Button>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Info Card */}
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Profile</CardTitle>
              <User className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user?.username || "Admin"}</div>
              <p className="text-xs text-muted-foreground">
                Logged in successfully
              </p>
            </CardContent>
          </Card>

          {/* System Status Card */}
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Online</div>
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                data-testid="button-manage-users"
              >
                Manage Users
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                data-testid="button-system-settings"
              >
                System Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                data-testid="button-view-logs"
              >
                View Logs
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Welcome Message */}
        <Card className="mt-8 shadow-lg">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome to Advantix Admin
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                You have successfully logged into the admin panel. From here, you can manage users, 
                configure system settings, monitor performance, and access all administrative features.
              </p>
              <div className="pt-4">
                <p className="text-sm text-gray-500">
                  Session started: {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
