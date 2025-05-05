import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useAuth } from "./hooks/useAuth";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import CandidateDashboard from "@/pages/candidate/Dashboard";
import CandidateProfile from "@/pages/candidate/Profile";
import CandidateMessages from "@/pages/candidate/Messages";
import CandidateJobs from "@/pages/candidate/Jobs";
import CandidateOnboarding from "@/pages/candidate/Onboarding";
import EmployerDashboard from "@/pages/employer/Dashboard";
import CompanyProfile from "@/pages/employer/CompanyProfile";
import JobListings from "@/pages/employer/JobListings";
import CandidateSearch from "@/pages/employer/CandidateSearch";
import AppHeader from "./components/AppHeader";
import Sidebar from "./components/Sidebar";
import { useEffect, useState } from "react";

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect based on authentication status
  useEffect(() => {
    if (!isLoading) {
      if (!user && !location.startsWith("/auth")) {
        console.log('No user found, redirecting to login');
        setLocation("/auth/login");
      } else if (
        user &&
        (location === "/auth/login" || location === "/auth/register")
      ) {
        // Redirect to appropriate dashboard based on role
        console.log('User found, redirecting to dashboard');
        if (user.role === "candidate") {
          setLocation("/candidate/dashboard");
        } else if (user.role === "employer") {
          setLocation("/employer/dashboard");
        }
      }
    }
  }, [user, isLoading, location, setLocation]);

  // Don't show loading indefinitely - if we're still loading after 2 seconds, just show the login page
  const [showLogin, setShowLogin] = useState(false);
  
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowLogin(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setShowLogin(false);
    }
  }, [isLoading]);

  if (isLoading && !showLogin) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/register" component={Register} />

      {/* Protected candidate routes */}
      <Route path="/candidate/dashboard">
        {user && user.role === "candidate" ? (
          <Layout>
            <CandidateDashboard />
          </Layout>
        ) : (
          <Redirect to="/auth/login" />
        )}
      </Route>
      <Route path="/candidate/profile">
        {user && user.role === "candidate" ? (
          <Layout>
            <CandidateProfile />
          </Layout>
        ) : (
          <Redirect to="/auth/login" />
        )}
      </Route>
      <Route path="/candidate/messages">
        {user && user.role === "candidate" ? (
          <Layout>
            <CandidateMessages />
          </Layout>
        ) : (
          <Redirect to="/auth/login" />
        )}
      </Route>
      <Route path="/candidate/jobs">
        {user && user.role === "candidate" ? (
          <Layout>
            <CandidateJobs />
          </Layout>
        ) : (
          <Redirect to="/auth/login" />
        )}
      </Route>
      <Route path="/candidate/onboarding">
        {user && user.role === "candidate" ? (
          <CandidateOnboarding />
        ) : (
          <Redirect to="/auth/login" />
        )}
      </Route>

      {/* Protected employer routes */}
      <Route path="/employer/dashboard">
        {user && user.role === "employer" ? (
          <Layout>
            <EmployerDashboard />
          </Layout>
        ) : (
          <Redirect to="/auth/login" />
        )}
      </Route>
      <Route path="/employer/company">
        {user && user.role === "employer" ? (
          <Layout>
            <CompanyProfile />
          </Layout>
        ) : (
          <Redirect to="/auth/login" />
        )}
      </Route>
      <Route path="/employer/jobs">
        {user && user.role === "employer" ? (
          <Layout>
            <JobListings />
          </Layout>
        ) : (
          <Redirect to="/auth/login" />
        )}
      </Route>
      <Route path="/employer/candidates">
        {user && user.role === "employer" ? (
          <Layout>
            <CandidateSearch />
          </Layout>
        ) : (
          <Redirect to="/auth/login" />
        )}
      </Route>

      {/* Root redirect */}
      <Route path="/">
        {user ? (
          user.role === "candidate" ? (
            <Redirect to="/candidate/dashboard" />
          ) : (
            <Redirect to="/employer/dashboard" />
          )
        ) : (
          <Redirect to="/auth/login" />
        )}
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);
  return null;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-neutral-lightest p-4 md:p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

export default App;
