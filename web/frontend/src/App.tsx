import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BookProvider } from "@/contexts/BookContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Categories from "./pages/Categories";
import Books from "./pages/Books";
import BookChunks from "./pages/BookChunks";
import Assignments from "./pages/Assignments";
import SpeakerBooks from "./pages/SpeakerBooks";
import SpeakerBookChunks from "./pages/SpeakerBookChunks";
import RecordBook from "./pages/RecordBook";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RootRoute() {
  const { user } = useAuth();
  
  // ProtectedRoute already ensures user exists
  if (user?.role === "admin") {
    return <Dashboard />;
  }
  
  if (user?.role === "speaker") {
    return <SpeakerBooks />;
  }
  
  // Fallback - should not happen, but just in case
  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Root route - conditional based on role */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RootRoute />
          </ProtectedRoute>
        }
      />
      
      {/* Admin Routes */}
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Categories />
          </ProtectedRoute>
        }
      />
      <Route
        path="/books"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Books />
          </ProtectedRoute>
        }
      />
      <Route
        path="/books/:bookId/chunks"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <BookChunks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assignments"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Assignments />
          </ProtectedRoute>
        }
      />

      {/* Speaker Routes */}
      <Route
        path="/speaker/books/:bookId/chunks"
        element={
          <ProtectedRoute allowedRoles={["speaker"]}>
            <SpeakerBookChunks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/record/:bookId"
        element={
          <ProtectedRoute allowedRoles={["speaker"]}>
            <RecordBook />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <BookProvider>
              <AppRoutes />
            </BookProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
