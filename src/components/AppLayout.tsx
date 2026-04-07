import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/hello-world", label: "Hello World" },
  { to: "/hello-styles", label: "Hello Styles" },
  { to: "/prototype", label: "Prototype" },
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1 className="brand-kicker">Mark & Edit</h1>
        </div>
        <nav className="top-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
