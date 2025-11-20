import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#0066cc] to-[#004999]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect via useEffect
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(username, password);
      // Редирект только при успешном логине
      navigate("/");
    } catch (error: unknown) {
      // Извлекаем сообщение об ошибке
      let errorMessage = "Invalid credentials";
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
      // НЕ делаем navigate при ошибке - остаемся на странице логина
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-light min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0066cc] to-[#004999] p-5">
      <div className="w-full max-w-[1000px] bg-white rounded-[30px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex flex-col md:flex-row">
        {/* Left Panel - Welcome Section */}
        <div className="hidden md:flex w-full md:w-1/2 bg-gradient-to-br from-[#0066cc] to-[#0052a3] p-10 md:p-20 relative overflow-hidden flex-col justify-center login-welcome-section">
          {/* Decorative circles */}
          <div className="absolute w-[300px] h-[300px] bg-white/10 rounded-full -top-[100px] -left-[50px] blur-[40px]"></div>
          <div className="absolute w-[200px] h-[200px] bg-white/20 rounded-full bottom-[50px] left-[50px] login-circle-1"></div>
          <div className="absolute w-[150px] h-[150px] bg-white/12 rounded-full top-[100px] right-[80px] login-circle-2"></div>
          <div className="absolute w-[100px] h-[100px] bg-white/8 rounded-full top-[50px] left-[100px] login-circle-3"></div>

          {/* Content */}
          <div className="relative z-10 text-white">
            <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-[2px] mb-2.5">WELCOME</h1>
            <h2 className="text-lg md:text-xl font-normal uppercase tracking-[1px] mb-5 opacity-90">TTS Studio</h2>
            <p className="text-sm md:text-base leading-relaxed opacity-80 max-w-[350px]">
              Professional recording platform for high-quality text-to-speech data collection. 
              Manage your recordings, assignments, and projects with ease.
            </p>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full md:w-1/2 p-10 md:p-20 bg-white flex items-center">
          <div className="w-full">
            <h3 className="text-3xl md:text-4xl font-semibold text-[#1a1a1a] mb-2.5">Sign in</h3>
            <p className="text-[13px] text-[#666] mb-8">
              Enter your credentials to access your account
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Field */}
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full py-3.5 pl-4 pr-4 border border-[#ddd] bg-white text-[#1a1a1a] rounded-lg text-sm focus:outline-none focus:border-[#0066cc]"
                  placeholder="User Name"
                />
              </div>

              {/* Password Field */}
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full py-3.5 pl-4 pr-16 border border-[#ddd] bg-white text-[#1a1a1a] rounded-lg text-sm focus:outline-none focus:border-[#0066cc]"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-none border-none text-[#0066cc] cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex justify-between items-center text-[13px] mb-6">
                <label className="flex items-center gap-2 text-[#666] cursor-pointer">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="w-4 h-4 border-[#ddd]"
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#"
                  className="text-[#0066cc] no-underline font-medium hover:underline transition-all"
                  onClick={(e) => e.preventDefault()}
                >
                  Forgot Password?
                </a>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-br from-[#003d7a] to-[#00528a] text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer mb-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,61,122,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              {/* Divider */}
              <div className="text-center my-5 text-[#999] text-[13px] relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#ddd]"></div>
                </div>
                <span className="relative px-4 bg-white">Or</span>
              </div>

              {/* Sign in with other Button */}
              <button
                type="button"
                className="w-full py-3.5 bg-white text-[#333] border border-[#ddd] rounded-lg text-[15px] font-semibold cursor-pointer transition-all hover:bg-[#f5f5f5] hover:border-[#ccc]"
              >
                Sign in with other
              </button>
            </form>

            {/* Footer */}
            <div className="text-center mt-6 text-[13px] text-[#666]">
              Don't have an account?{" "}
              <a
                href="#"
                className="text-[#0066cc] no-underline font-semibold hover:underline transition-all"
                onClick={(e) => e.preventDefault()}
              >
                Sign up
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .login-welcome-section {
            clip-path: polygon(0 0, 100% 0, 85% 100%, 0 100%);
          }
        }
      `}</style>
    </div>
  );
}

