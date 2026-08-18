import {
  LayoutDashboard,
  Package,
  Search,
  Bell,
  CalendarDays,
  BarChart2,
  Settings,
  LogOut,
  HeartHandshake,
} from "lucide-react";
import { colors, fonts } from "../../theme";
import { clearAuth } from "../../utils/auth";

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "inventory", label: "Food Inventory", icon: Package },
  { id: "donation-listing", label: "Donation Listing", icon: HeartHandshake },
  { id: "browse", label: "Browse Food Item", icon: Search },
  { id: "expiry", label: "Expiry Alerts", icon: Bell },
  { id: "meal-planner", label: "Meal Planner", icon: CalendarDays },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function DashboardSidebar({
  activePage,
  onNavigate,
  onAppNavigate,
  collapsed = false,
}) {
  const effectivePage =
    activePage === "edit-food" || activePage === "add-food"
      ? "inventory"
      : activePage;

  const handleLogout = () => {
    clearAuth();
    onAppNavigate?.("home");
  };

  return (
    <aside
      className="d-flex flex-column flex-shrink-0 min-vh-100 position-sticky"
      draggable="false"
      style={{
        width: collapsed ? 76 : 200,
        background: colors.showcase_green,
        borderRight: `2px solid ${colors.greenL}`,
        fontFamily: fonts.body,
        transition: "width 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        top: 0,
        alignSelf: "flex-start",
      }}
    >
      <style>{`
        .sidebar-nav-btn {
          width:90%;
          padding: 0.70rem 0.45rem;
          position: relative;
          color: ${colors.charcoal};
          background: transparent;
          transition: all 0.15s ease;
          opacity: 0.75;
          overflow: hidden;
          white-space: nowrap;
        }

        .sidebar-nav-btn::before {
          content: "";
          position: absolute;
          left: 2px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 0%;
          border-radius: 4px;
          background: ${colors.greenD};
          transition: height 0.18s ease;
        }

        .sidebar-nav-btn:hover:not(:disabled) {
          background-color: ${colors.low_greenFade};
          color: ${colors.greenD};
          opacity: 1;
        }

        .sidebar-nav-btn:hover:not(:disabled)::before {
          height: 45%;
        }

        .sidebar-nav-btn:active:not(:disabled) {
          background-color: ${colors.greenLrgb};
          transform: scale(0.99);
        }

        .sidebar-nav-btn:focus-visible {
          outline: 2px solid ${colors.green};
          outline-offset: 1px;
          background-color: ${colors.low_greenFade};
          color: ${colors.greenD};
          opacity: 1;
        }

        .sidebar-nav-btn.is-active {
          background-color: ${colors.greenLrgb};
          color: ${colors.greenXd};
          font-weight: 600;
          opacity: 1;
        }

        .sidebar-nav-btn.is-active svg {
          color: ${colors.greenXd};
        }

        .nav-label {
          transition: opacity 0.15s ease, max-width 0.22s ease;
          overflow: hidden;
        }

        .collapsed {
          justify-content: center;
        }

        .collapsed .nav-label {
          opacity: 0;
          max-width: 0;
        }

        .sidebar-nav-btn.collapsed .nav-tooltip, 
        .sidebar-logout-btn.collapsed .nav-tooltip {
          position: absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%) translateX(-6px);
          background: ${colors.greenXd};
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 500;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease, transform 0.15s ease;
          z-index: 20;
          box-shadow: 0 4px 12px rgba(0,0,0,0.18);
        }

        .sidebar-nav-btn.collapsed:hover .nav-tooltip {
          opacity: 0.75;
          transform: translateY(-50%) translateX(0);
        }

        .sidebar-logout-btn {
          opacity: 0.75;
          transition: all 0.25s ease;
          position: relative;
        }

        .sidebar-logout-btn:hover:not(:disabled) {
          background-color: ${colors.green};
          opacity: 1 !important;
          color: ${colors.white};
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
        }
      `}</style>

      <div
        className="d-flex px-2 py-2"
        style={{
          margin: "2rem 0 1.5rem 0",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src="/images/zerowaste-logo.png"
          alt="ZeroWaste logo"
          style={{
            width: collapsed ? 45 : 90,
            height: collapsed ? 45 : 90,
            objectFit: "contain",
            transition: "width 0.22s ease, height 0.22s ease",
          }}
        />
      </div>

      <nav className="flex-grow-1">
        <ul
          className="list-unstyled d-flex flex-column gap-2 mb-0 p-2"
          style={{
            width: "100%",
          }}
        >
          {NAV_ITEMS.map(({ id, label, icon: Icon, disabled }) => {
            const isActive = effectivePage === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  className={`sidebar-nav-btn btn d-flex align-items-center gap-2 border-0 text-start ${
                    isActive ? "is-active" : ""
                  } ${collapsed ? "collapsed" : ""}`}
                  disabled={disabled}
                  onClick={() => !disabled && onNavigate(id)}
                  style={{
                    borderRadius: 6,
                    fontSize: "0.9rem",
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  <Icon size={18} strokeWidth={2} />
                  <span className="nav-label">{label}</span>
                  {collapsed && <span className="nav-tooltip">{label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3" style={{ borderTop: `2px solid ${colors.greenL}` }}>
        <button
          type="button"
          className={`sidebar-logout-btn btn w-100 d-flex align-items-center gap-2 border-0 text-start ${
            collapsed ? "collapsed" : ""
          }`}
          style={{
            backgroundColor: colors.showcase_green,
            fontFamily: fonts.body,
            fontWeight: 600,
            borderRadius: "8px",
            color: colors.greenD,
            padding: "0.65rem 0.45rem",
            fontSize: "0.9rem",
          }}
          onClick={handleLogout}
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          <span className="nav-label">Log out</span>
          {collapsed && <span className="nav-tooltip">Log out</span>}
        </button>
      </div>
    </aside>
  );
}
