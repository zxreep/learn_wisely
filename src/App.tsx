import { Component, type ErrorInfo, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { LoadingBlock } from "./components/Status";
import { AuthPage } from "./pages/AuthPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { AppShell } from "./components/AppShell";
import { BoardPage } from "./pages/BoardPage";
import { LibraryPage } from "./pages/LibraryPage";
import { CommunitiesPage, CommunityPage } from "./pages/CommunitiesPage";
import { ChatsPage } from "./pages/ChatsPage";
import { CoachPage } from "./pages/CoachPage";
import { ProfilePage } from "./pages/ProfilePage";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Unhandled UI error", error, info); }
  render() {
    if (this.state.error) return <main className="fatal-error"><img src="/mark.svg" alt="" /><h1>We lost our place.</h1><p>Your data is safe. Refresh the page to reconnect.</p><button className="button button--primary" onClick={() => location.reload()}>Refresh</button></main>;
    return this.props.children;
  }
}

export function App() {
  const { user, loading } = useAuth();
  if (loading) return <main className="boot-screen"><img src="/mark.svg" alt="" /><LoadingBlock label="Opening your desk" /></main>;
  if (!user) return <AuthPage />;
  if (!user.onboarded) return <OnboardingPage />;
  return <ErrorBoundary><Routes>
    <Route element={<AppShell />}>
      <Route index element={<Navigate to="/board" replace />} />
      <Route path="/board" element={<BoardPage />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/communities" element={<CommunitiesPage />} />
      <Route path="/communities/:id" element={<CommunityPage />} />
      <Route path="/chats" element={<ChatsPage />} />
      <Route path="/coach" element={<CoachPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/board" replace />} />
    </Route>
  </Routes></ErrorBoundary>;
}
