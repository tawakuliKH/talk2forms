import { useState } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import type { Session } from "../lib/supabaseClient";
import { signOut } from "../lib/supabaseClient";

interface Props {
  session: Session;
}

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/profile": "Profile",
};

export default function DashboardLayout({ session }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const location = useLocation();
  const email = session.user.email || "";
  const initials = email.slice(0, 2).toUpperCase();
  const pageTitle = TITLES[location.pathname] || "Dashboard";

  return (
    <div className="dl-shell">
      <aside className="dl-sidebar">
        <Link to="/" className="dl-logo">
          Talk2Forms<span>.</span>
        </Link>
        <nav className="dl-nav">
          <NavLink to="/dashboard" end className="dl-nav-link">
            <span className="dl-nav-icon" />
            Overview
          </NavLink>
          <NavLink to="/dashboard/profile" className="dl-nav-link">
            <span className="dl-nav-icon" />
            Profile
          </NavLink>
        </nav>
        <div className="dl-profile-block">
          {menuOpen && (
            <div className="dl-menu" onMouseLeave={() => setMenuOpen(false)}>
              <Link to="/dashboard/profile" className="dl-menu-item" onClick={() => setMenuOpen(false)}>
                👤 My Profile
              </Link>
              <button className="dl-menu-item dl-menu-item-disabled" disabled title="Coming soon">
                📋 My Resumes
              </button>
              <button className="dl-menu-item dl-menu-item-disabled" disabled title="Coming soon">
                ⚙️ Settings
              </button>
              <div className="dl-menu-divider" />
              <button className="dl-menu-item dl-menu-item-danger" onClick={() => signOut()}>
                🚪 Sign out
              </button>
            </div>
          )}
          <button className="dl-profile-btn" onClick={() => setMenuOpen((v) => !v)}>
            <span className="dl-avatar">{initials}</span>
            <span className="dl-profile-text">
              <span className="dl-profile-email">{email}</span>
              <span className="dl-profile-hint">View account</span>
            </span>
            <span className={`dl-chevron ${menuOpen ? "dl-chevron-open" : ""}`}>⌃</span>
          </button>
        </div>
      </aside>

      <div className="dl-main">
        <header className="dl-topbar">
          <div className="dl-breadcrumb">
            <span className="dl-breadcrumb-muted">Dashboard</span>
            <span className="dl-breadcrumb-sep">/</span>
            <span>{pageTitle}</span>
          </div>
          <div className="dl-topbar-corner">
            <button className="dl-topbar-avatar" title={email} onClick={() => setTopMenuOpen((v) => !v)}>
              {initials}
            </button>
            {topMenuOpen && (
              <div className="dl-menu dl-menu-top" onMouseLeave={() => setTopMenuOpen(false)}>
                <Link to="/dashboard/profile" className="dl-menu-item" onClick={() => setTopMenuOpen(false)}>
                  👤 My Profile
                </Link>
                <button className="dl-menu-item dl-menu-item-disabled" disabled title="Coming soon">
                  📋 My Resumes
                </button>
                <button className="dl-menu-item dl-menu-item-disabled" disabled title="Coming soon">
                  ⚙️ Settings
                </button>
                <div className="dl-menu-divider" />
                <button className="dl-menu-item dl-menu-item-danger" onClick={() => signOut()}>
                  🚪 Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="dl-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}