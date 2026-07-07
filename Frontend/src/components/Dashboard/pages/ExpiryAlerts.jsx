import { useEffect, useState, useMemo } from 'react';
import { Bell, RefreshCw, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { colors, fonts } from '../../../theme';
import { foodApi } from '../../../services/api';
import DonateModal from '../DonateModal';

const PAGE_SIZE = 8;

function getDaysLeft(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const FILTERS = ['All', 'Expiring Soon', 'Expired'];

// Items expiring within 7 days (but not yet expired) count as "Expiring Soon"
function getStatus(daysLeft) {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return 'Expired';
  if (daysLeft <= 7) return 'Expiring Soon';
  return 'Fresh';
}

export default function ExpiryAlerts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [donatingId, setDonatingId] = useState(null);
  const [page, setPage] = useState(1);

  const loadItems = () => {
    setLoading(true);
    setError('');
    foodApi
      .getAll()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Failed to load food items.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadItems(); }, []);

  const [donateTarget, setDonateTarget] = useState(null);

  const handleDonateConfirm = async (details) => {
    setDonatingId(donateTarget.id);
    try {
      await foodApi.donate(donateTarget.id, details);
      setDonateTarget(null);
      // Move the item into the "donated" pool on the backend; refresh this list.
      loadItems();
    } finally {
      setDonatingId(null);
    }
  };

  // Only show items that are expiring soon or already expired
  const alertItems = useMemo(() => {
    return items
      .map((item) => ({ ...item, daysLeft: getDaysLeft(item.expiryDate) }))
      .filter((item) => item.daysLeft !== null && item.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'All') return alertItems;
    return alertItems.filter((item) => getStatus(item.daysLeft) === activeFilter);
  }, [alertItems, activeFilter]);

  useEffect(() => { setPage(1); }, [activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-start justify-content-between mb-2 gap-3 flex-wrap">
        <div>
          <h1 style={{ fontFamily: fonts.display, fontSize: '1.85rem', fontWeight: 700, color: colors.charcoal, marginBottom: '0.25rem' }}>
            Expiry Alerts
          </h1>
          <p className="mb-0" style={{ color: colors.muted }}>
            Never let good food go to waste with timely expiry reminders.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm d-inline-flex align-items-center gap-2"
          onClick={loadItems}
          style={{ border: `1.5px solid ${colors.border}`, borderRadius: 8, color: colors.muted, background: 'white', padding: '0.4rem 0.9rem', fontSize: '0.825rem' }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="d-flex gap-2 mb-4 mt-4">
        {FILTERS.map((f) => {
          const isActive = activeFilter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className="fw-semibold"
              style={{
                padding: '0.5rem 1.4rem',
                fontSize: '0.9rem',
                border: 'none',
                borderRadius: 10,
                background: isActive ? colors.authGreen : '#eef2e3',
                color: isActive ? 'white' : colors.charcoal,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {error && <div className="alert alert-danger py-2 small mb-4">{error}</div>}

      {/* Table card */}
      <div className="rounded-4 overflow-hidden" style={{ border: `1px solid ${colors.border}`, background: '#fbfaf4' }}>
        {loading ? (
          <div className="text-center py-5" style={{ color: colors.muted }}>Loading alerts…</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-5">
            <Bell size={36} color={colors.border} className="mb-3 d-block mx-auto" />
            <p className="mb-1 fw-semibold" style={{ color: colors.charcoal }}>
              {activeFilter === 'All' ? 'All your food is fresh!' : `No items with status "${activeFilter}"`}
            </p>
            <p className="mb-0 small" style={{ color: colors.muted }}>
              {activeFilter === 'All' && 'Items expiring within 7 days will appear here.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr style={{ background: '#f6f0c8', fontSize: '0.9rem', color: colors.charcoal }}>
                  <th className="ps-4 py-3 border-0 fw-bold">Food Items</th>
                  <th className="py-3 border-0 fw-bold">Category</th>
                  <th className="py-3 border-0 fw-bold">Days Left</th>
                  <th className="py-3 border-0 fw-bold">Expiry Date</th>
                  <th className="py-3 border-0 fw-bold">Status</th>
                  <th className="pe-4 py-3 border-0 fw-bold text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item, idx) => {
                  const status = getStatus(item.daysLeft);
                  const isExpired = status === 'Expired';

                  const daysLabel = isExpired ? '-' : item.daysLeft === 0 ? 'Today' : `${item.daysLeft} day${item.daysLeft !== 1 ? 's' : ''}`;

                  return (
                    <tr key={item.id} style={{ borderTop: idx === 0 ? 'none' : `1px solid ${colors.border}` }}>
                      <td className="ps-4 py-3">
                        <span className="fw-semibold" style={{ color: colors.charcoal }}>{item.name}</span>
                      </td>
                      <td className="py-3" style={{ color: colors.charcoal }}>{item.category}</td>
                      <td className="py-3" style={{ color: colors.charcoal }}>{daysLabel}</td>
                      <td className="py-3" style={{ color: colors.charcoal }}>{formatDate(item.expiryDate)}</td>
                      <td className="py-3">
                        <span
                          className="px-3 py-1 rounded-2"
                          style={{
                            background: isExpired ? '#f3d9ce' : '#dcead0',
                            color: colors.charcoal,
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            display: 'inline-block',
                          }}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="pe-4 py-3 text-end">
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={donatingId === item.id}
                          onClick={() => setDonateTarget(item)}
                          style={{ background: '#c9dcb8', border: 'none', borderRadius: 8, color: colors.charcoal, fontWeight: 500, padding: '0.4rem 1.1rem' }}
                        >
                          {donatingId === item.id ? 'Donating…' : 'Donate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && filteredItems.length > 0 && totalPages > 1 && (
        <div className="d-flex align-items-center justify-content-end gap-3 mt-4">
          <button
            type="button"
            className="btn btn-sm p-1"
            style={{ color: currentPage === 1 ? colors.border : colors.charcoal, background: 'none', border: 'none' }}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronsLeft size={20} />
          </button>
          <span className="fw-semibold" style={{ color: colors.charcoal }}>{currentPage}</span>
          <button
            type="button"
            className="btn btn-sm p-1"
            style={{ color: currentPage === totalPages ? colors.border : colors.charcoal, background: 'none', border: 'none' }}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <ChevronsRight size={20} />
          </button>
        </div>
      )}

      <DonateModal
        item={donateTarget}
        onCancel={() => setDonateTarget(null)}
        onConfirm={handleDonateConfirm}
      />
    </div>
  );
}
