// src/components/Dashboard/pages/BrowseFoodItem.jsx
import { useEffect, useMemo, useState } from 'react';
import { Search, ChevronRight, ChevronsLeft, ChevronsRight, User } from 'lucide-react';
import { colors, fonts, btnPrimaryStyle, btnOutlineStyle } from '../../../theme';
import { foodApi } from '../../../services/api';

const CATEGORIES = ['All Categories', 'Fruits', 'Vegetable', 'Dairy', 'Meat'];
const PAGE_SIZE = 6;

const DEFAULT_IMAGE_BY_CATEGORY = {
  Fruits: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&h=200&fit=crop',
  Vegetable: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=200&h=200&fit=crop',
  Dairy: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&h=200&fit=crop',
  Meat: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&h=200&fit=crop',
};
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getDaysLeft(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function getDonorName(item) {
  return item.donorName || item.donor || item.ownerName || item.userName || item.username || 'Anonymous';
}

function getLocation(item) {
  return item.pickupLocation || item.location || item.city || item.address || 'Location not specified';
}

function getAvailableTime(item) {
  return item.availableTime || item.pickupTime || 'Not specified';
}

function getContactDetail(item) {
  return item.contactDetail || item.contact || item.phone || 'Not provided';
}

function getImage(item) {
  return item.imageUrl || DEFAULT_IMAGE_BY_CATEGORY[item.category] || FALLBACK_IMAGE;
}

export default function BrowseFoodItem({ onNavigate }) {
  const [search, setSearch] = useState(''); 
  const [category, setCategory] = useState('All Categories');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showContact, setShowContact] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState('');

  const loadItems = async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const data = await foodApi.browse();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrMsg(err.message || 'Failed to load donated items.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'All Categories' || item.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, category]);

  useEffect(() => {
    setPage(1);
  }, [search, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openDetails = (item) => {
    setSelectedItem(item);
    setShowContact(false);
    setClaimMsg('');
  };

 const handleClaim = async () => {
    if (!selectedItem) return;
    setClaiming(true);
    setClaimMsg('');
    try {
      await foodApi.claim(selectedItem.id);
      setClaimMsg('Donation claimed! It has been added to your food inventory.');
      setItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
      // Send the claimed item straight to the claimer's Food Inventory.
      setTimeout(() => {
        setSelectedItem(null);
        onNavigate?.('inventory');
      }, 900);
    } catch (err) {
      setClaimMsg(err.message || 'Failed to claim this donation. Please try again.');
    } finally {
      setClaiming(false);
    }
  };
  // ---------- Detail view ----------
  if (selectedItem) {
    const daysLeft = getDaysLeft(selectedItem.expiryDate);
    const daysLeftLabel = daysLeft === null ? '' : daysLeft < 0 ? ' (expired)' : daysLeft === 0 ? ' (today)' : ` (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)`;

    return (
      <div>
        <button
          type="button"
          className="btn btn-link p-0 mb-3 text-decoration-none"
          style={{ color: colors.charcoal, fontWeight: 600 }}
          onClick={() => setSelectedItem(null)}
        >
          ← Back
        </button>

        <div
          className="rounded-4 p-4"
          style={{ background: '#fbfaf1', border: `1.5px solid ${colors.authGreen}` }}
        >
          <div className="row g-4">
            <div className="col-12 col-md-4">
              <img
                src={getImage(selectedItem)}
                alt={selectedItem.name}
                className="rounded-4 w-100"
                style={{ height: 260, objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
              />
            </div>

            <div className="col-12 col-md-8">
              <h2 style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.charcoal, borderBottom: `1px solid ${colors.border}`, paddingBottom: '0.6rem' }}>
                {selectedItem.name}
              </h2>

              <div className="d-flex align-items-center gap-2 mt-3 mb-3">
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-circle"
                  style={{ width: 36, height: 36, background: '#cfe0c2', color: colors.charcoal }}
                >
                  <User size={18} />
                </span>
                <div>
                  <div className="small" style={{ color: colors.muted }}>Donor</div>
                  <div className="fw-bold" style={{ color: colors.charcoal }}>{getDonorName(selectedItem)}</div>
                </div>
              </div>

              <div className="row">
                <div className="col-12 col-lg-7">
                  <table className="table table-borderless mb-0" style={{ fontSize: '0.92rem' }}>
                    <tbody>
                      <tr>
                        <td className="ps-0 py-1" style={{ color: colors.muted, width: 140 }}>Quantity</td>
                        <td className="py-1 fw-bold" style={{ color: colors.charcoal }}>{selectedItem.quantity} {selectedItem.quantityUnit}</td>
                      </tr>
                      <tr>
                        <td className="ps-0 py-1" style={{ color: colors.muted }}>Category</td>
                        <td className="py-1 fw-bold" style={{ color: colors.charcoal }}>{selectedItem.category}</td>
                      </tr>
                      <tr>
                        <td className="ps-0 py-1" style={{ color: colors.muted }}>Expiry Date</td>
                        <td className="py-1 fw-bold" style={{ color: colors.charcoal }}>{formatDate(selectedItem.expiryDate)}{daysLeftLabel}</td>
                      </tr>
                      <tr>
                        <td className="ps-0 py-1" style={{ color: colors.muted }}>Pickup Location</td>
                        <td className="py-1 fw-bold" style={{ color: colors.charcoal }}>{getLocation(selectedItem)}</td>
                      </tr>
                      <tr>
                        <td className="ps-0 py-1" style={{ color: colors.muted }}>Available Time</td>
                        <td className="py-1 fw-bold" style={{ color: colors.charcoal }}>{getAvailableTime(selectedItem)}</td>
                      </tr>
                      {selectedItem.notes && (
                        <tr>
                          <td className="ps-0 py-1" style={{ color: colors.muted }}>Notes</td>
                          <td className="py-1 fw-bold" style={{ color: colors.charcoal }}>{selectedItem.notes}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="col-12 col-lg-5">
                  <iframe
                    title="Pickup location map"
                    className="rounded-3 w-100"
                    style={{ height: 160, border: `1px solid ${colors.border}` }}
                    loading="lazy"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(getLocation(selectedItem))}&output=embed`}
                  />
                </div>
              </div>

              {showContact && (
                <div className="alert alert-success py-2 small mt-3 mb-0">
                  Contact: {getContactDetail(selectedItem)}
                </div>
              )}
              {claimMsg && (
                <div className={`alert py-2 small mt-3 mb-0 ${claimMsg.startsWith('Donation claimed') ? 'alert-success' : 'alert-danger'}`}>
                  {claimMsg}
                </div>
              )}

              <div className="d-flex justify-content-end gap-3 mt-4">
                <button
                  type="button"
                  className="btn px-4"
                  style={btnOutlineStyle}
                  onClick={() => setShowContact((v) => !v)}
                >
                  Contact Donor
                </button>
                <button
                  type="button"
                  className="btn px-4"
                  style={{ ...btnPrimaryStyle, background: colors.authGreen, borderColor: colors.authGreen }}
                  onClick={handleClaim}
                  disabled={claiming || claimMsg.startsWith('Donation claimed')}
                >
                  {claiming ? 'Claiming…' : 'Claim Donations'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Grid / list view ----------
  return (
    <div>
      <h1 style={{ fontFamily: fonts.display, fontSize: '1.85rem', fontWeight: 700, color: colors.charcoal, marginBottom: '0.25rem' }}>
        Browse Food Items
      </h1>
      <p className="mb-4" style={{ color: colors.muted }}>
        Stay organized with a complete view of your food inventory.
      </p>

      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        <div className="position-relative flex-grow-1" style={{ maxWidth: 380 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: colors.muted }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.4rem', borderRadius: 10, borderColor: colors.border, height: 44 }}
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="position-relative">
          <select
            className="form-select fw-semibold"
            style={{ background: '#f6f0c8', borderColor: '#f6f0c8', borderRadius: 10, height: 44, paddingRight: '2.2rem', appearance: 'none' }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronRight size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      </div>

      {errMsg && <div className="alert alert-danger py-2 small mb-3">{errMsg}</div>}

      <div className="rounded-4 p-4" style={{ background: '#fbfaf4', border: `1px solid ${colors.border}` }}>
        {loading ? (
          <div className="text-center py-5" style={{ color: colors.muted }}>Loading donated items…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-5" style={{ color: colors.muted }}>
            No donated items are available right now.
          </div>
        ) : (
          <>
            <div className="row g-4">
              {paginated.map((item) => (
                <div className="col-12 col-md-6 col-lg-4" key={item.id}>
                  <div
                    className="p-3 rounded-4 h-100 d-flex gap-3"
                    style={{ background: '#eef2e3', border: `1px solid ${colors.border}` }}
                  >
                    <img
                      src={getImage(item)}
                      alt={item.name}
                      className="rounded-3 flex-shrink-0"
                      style={{ width: 84, height: 84, objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                    <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                      <div className="fw-bold" style={{ color: colors.charcoal }}>{item.name}</div>
                      <div className="small" style={{ color: colors.charcoal }}>
                        {item.quantity} {item.quantityUnit} - {item.category}
                      </div>
                      <div className="small mb-2" style={{ color: colors.muted }}>
                        Expires {formatDate(item.expiryDate)}
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm mt-auto align-self-start"
                        style={{ ...btnPrimaryStyle, background: colors.authGreen, borderColor: colors.authGreen, fontSize: '0.8rem' }}
                        onClick={() => openDetails(item)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
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
          </>
        )}
      </div>
    </div>
  );
}