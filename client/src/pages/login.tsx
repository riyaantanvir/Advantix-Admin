import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Loader2, Eye, EyeOff } from "lucide-react";

interface LoginResponse {
  user: {
    id: string;
    username: string;
  };
  token: string;
  expiresAt: string;
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ username: "", password: "" });
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Validation functions
  const validateUsername = (value: string) => {
    if (!value.trim()) {
      return "Username is required";
    }
    if (value.length < 2) {
      return "Username must be at least 2 characters";
    }
    return "";
  };

  const validatePassword = (value: string) => {
    if (!value) {
      return "Password is required";
    }
    if (value.length < 3) {
      return "Password must be at least 3 characters";
    }
    return "";
  };

  // Handle username change with validation
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    const error = validateUsername(value);
    setErrors(prev => ({ ...prev, username: error }));
  };

  // Handle password change with validation  
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const error = validatePassword(value);
    setErrors(prev => ({ ...prev, password: error }));
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return response.json() as Promise<LoginResponse>;
    },
    onSuccess: (data) => {
      // Store token in localStorage
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // Dispatch custom event to notify auth state change
      window.dispatchEvent(new Event("auth-change"));
      
      toast({
        title: "Login successful!",
        description: "Welcome to Advantix Admin.",
      });
      
      // Redirect to home after a short delay
      setTimeout(() => {
        setLocation("/");
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: "Invalid username or password. Please try again.",
        variant: "destructive",
      });
      setPassword("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);
    
    setErrors({
      username: usernameError,
      password: passwordError,
    });
    
    // Stop submission if there are validation errors
    if (usernameError || passwordError) {
      toast({
        title: "Validation errors",
        description: "Please fix the errors below and try again.",
        variant: "destructive",
      });
      return;
    }
    
    loginMutation.mutate({ username: username.trim(), password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Card className="bg-white rounded-2xl shadow-xl border border-gray-100">
          <CardContent className="p-8 space-y-6">
            {/* Header Section */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Advantix Admin
              </h1>
              <p className="text-gray-600 text-sm">
                Sign in to access the admin panel
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Username
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Admin"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white outline-none text-gray-900 ${
                    errors.username 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-200 focus:ring-blue-500'
                  }`}
                  required
                  data-testid="input-username"
                />
                {errors.username && (
                  <p className="text-sm text-red-600 mt-1" data-testid="error-username">
                    {errors.username}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white outline-none text-gray-900 ${
                      errors.password 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-200 focus:ring-blue-500'
                    }`}
                    required
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1" data-testid="error-password">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>

              {/* Forgot Password Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => toast({
                    title: "Password Reset",
                    description: "For demo purposes: Use default credentials Admin/2604. In production, this would send a reset email.",
                    duration: 5000,
                  })}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200"
                  data-testid="link-forgot-password"
                >
                  Forgot your password?
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            For testing: Admin / 2604
          </p>
        </div>
      </div>
    </div>
  );
}
