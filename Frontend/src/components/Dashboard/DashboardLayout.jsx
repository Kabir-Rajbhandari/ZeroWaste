import { Menu, Bell, User } from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import { colors } from '../../theme';
import { getStoredUser } from '../../utils/auth';

export default function DashboardLayout({ activePage, onPageChange, onNavigate, children }) {
  const user = getStoredUser();

  return (
    <div className="d-flex min-vh-100" style={{ background: colors.cream }}>
      <DashboardSidebar
        activePage={activePage}
        onNavigate={onPageChange}
        onAppNavigate={onNavigate}
      />

      <div className="flex-grow-1 d-flex flex-column min-vh-100">
        <header
          className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom"
          style={{ background: colors.dashboardAccent, borderColor: 'rgba(255,255,255,0.15) !important' }}
        >
          <button
            type="button"
            className="btn btn-link p-0"
            style={{ color: '#fff' }}
            aria-label="Toggle menu"
          >
            <Menu size={22} />
          </button>

          <div className="d-flex align-items-center gap-3">
            <button type="button" className="btn btn-link p-0" style={{ color: 'rgba(255,255,255,0.85)' }}>
              <Bell size={20} />
            </button>

            <div className="d-flex align-items-center gap-2">
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.2)', color: '#fff' }}
              >
                <User size={18} />
              </span>
              <span className="fw-semibold text-white">
                {user?.fullName || 'Username'}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-grow-1 p-4 p-lg-5 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
