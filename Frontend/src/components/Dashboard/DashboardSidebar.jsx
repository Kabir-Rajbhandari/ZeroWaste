import {
  LayoutDashboard,
  Package,
  Search,
  Bell,
  CalendarDays,
  BarChart2,
  Settings,
  LogOut,
} from 'lucide-react';
import { colors, fonts } from '../../theme';
import { clearAuth } from '../../utils/auth';

const NAV_ITEMS = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Food Inventory', icon: Package },
  { id: 'browse', label: 'Browse Food Item', icon: Search },
  { id: 'expiry', label: 'Expiry Alerts', icon: Bell },
  { id: 'meal-planner', label: 'Meal Planner', icon: CalendarDays },
  { id: 'analytics', label: 'Analytics', icon: BarChart2, disabled: true },
  { id: 'settings', label: 'Settings', icon: Settings, disabled: true },
];

export default function DashboardSidebar({ activePage, onNavigate, onAppNavigate }) {
  const effectivePage =
    activePage === 'edit-food' || activePage === 'add-food' ? 'inventory' : activePage;

  const handleLogout = () => {
    clearAuth();
    onAppNavigate?.('home');
  };

  return (
    <aside
      className="d-flex flex-column flex-shrink-0 border-end min-vh-100"
      style={{ width: 260, background: colors.dashboardAccent, borderColor: 'rgba(255,255,255,0.15) !important' }}
    >
      <div
        className="d-flex align-items-center gap-2 px-4 py-4 border-bottom"
        style={{ borderColor: 'rgba(255,255,255,0.15) !important' }}
      >
        <img
          src="/images/zerowaste-logo.png"
          alt="ZeroWaste logo"
          style={{ width: 40, height: 40, objectFit: 'contain', background: '#fff', borderRadius: 8 }}
        />
        <span style={{ fontFamily: fonts.display, fontSize: '1.2rem', fontWeight: 700, color: 'rgba(0, 0, 0, 0.4)' }}>
          ZeroWaste
        </span>
      </div>

      <nav className="flex-grow-1 p-3">
        <ul className="list-unstyled d-flex flex-column gap-1 mb-0">
          {NAV_ITEMS.map(({ id, label, icon: Icon, disabled }) => {
            const isActive = effectivePage === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  className="btn w-100 d-flex align-items-center gap-3 border-0 text-start"
                  disabled={disabled}
                  onClick={() => !disabled && onNavigate(id)}
                  style={{
                    padding: '0.65rem 1rem',
                    borderRadius: 10,
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 500,
                    color: disabled ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.4)',
                    background: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                    opacity: disabled ? 0.6 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3 border-top" style={{ borderColor: 'rgba(255,255,255,0.15) !important' }}>
        <button
          type="button"
          className="btn w-100 d-flex align-items-center gap-3 border-0 text-start"
          style={{
            padding: '0.65rem 1rem',
            borderRadius: 10,
            fontSize: '0.9rem',
            fontWeight: 500,
            color: 'rgba(0, 0, 0, 0.4)',
            background: 'transparent',
          }}
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}
