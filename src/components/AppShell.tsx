import { BookOpen, Bot, LayoutDashboard, MessageCircle, Sparkles, UsersRound, UserRound } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Avatar } from "./Avatar";

const nav = [
  { to: "/board", label: "Board", icon: LayoutDashboard },
  { to: "/library", label: "Library", icon: BookOpen },
  { to: "/communities", label: "Communities", icon: UsersRound },
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/coach", label: "Coach", icon: Sparkles },
];

export function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => { mainRef.current?.focus({ preventScroll: true }); }, [location.pathname]);
  return <div className="app-shell">
    <aside className="sidebar glass-panel">
      <NavLink to="/board" className="brand" aria-label="Learn Wisely home"><img src="/mark.svg" alt="" /><span>learn <b>wisely</b></span></NavLink>
      <nav className="desktop-nav" aria-label="Main navigation">
        {nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`}><Icon size={19} /><span>{label}</span></NavLink>)}
      </nav>
      <div className="sidebar-note"><Bot size={17} /><p><b>Small steps count.</b><br />Log the time you really study.</p></div>
      <NavLink to="/profile" className={({ isActive }) => `profile-link ${isActive ? "is-active" : ""}`}>
        <Avatar name={user!.name} color={user!.avatarColor} size={40} /><span><b>{user!.name}</b><small>@{user!.handle}</small></span><UserRound size={17} />
      </NavLink>
    </aside>
    <main className="main-content" ref={mainRef} tabIndex={-1}><Outlet /></main>
    <nav className="mobile-nav glass-panel" aria-label="Main navigation">
      {nav.slice(0, 4).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? "is-active" : ""}><Icon size={20} /><span>{label}</span></NavLink>)}
      <NavLink to="/profile" className={({ isActive }) => isActive ? "is-active" : ""}><UserRound size={20} /><span>Profile</span></NavLink>
    </nav>
  </div>;
}
