// src/components/Dashboard/pages/FoodInventory.jsx
import { useCallback, useEffect, useState } from 'react';
import { Search, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { colors, fonts, btnPrimaryStyle } from '../../../theme';
import { foodApi } from '../../../services/api';
import DonateModal from '../DonateModal';

const CATEGORIES = ['All Categories', 'Fruits', 'Vegetable', 'Dairy', 'Meat'];

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function FoodInventory({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [donateTarget, setDonateTarget] = useState(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const data = await foodApi.getAll();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrMsg(err.message || 'Failed to load food items.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this food item?')) return;
    try {
      await foodApi.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setErrMsg(err.message || 'Failed to delete item.');
    }
  };

  const handleUsed = async (id) => {
    if (!window.confirm('Mark this item as used? It will be removed from your inventory.')) return;
    try {
      await foodApi.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setErrMsg(err.message || 'Failed to remove item.');
    }
  };

  const handleDonateConfirm = async (details) => {
    await foodApi.donate(donateTarget.id, details);
    setItems((prev) => prev.filter((item) => item.id !== donateTarget.id));
    setDonateTarget(null);
    onNavigate?.('browse');
  };

  const filtered = items.filter((item) => {
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All Categories' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <h1 style={{ fontFamily: fonts.display, fontSize: '1.85rem', fontWeight: 700, color: colors.charcoal, marginBottom: '0.25rem' }}>
        Food Inventory
      </h1>
      <p className="mb-4" style={{ color: colors.muted }}>
        Stay organized with a complete view of your food inventory.
      </p>

      {errMsg && <div className="alert alert-danger py-2 small mb-3">{errMsg}</div>}

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

        <button
          type="button"
          className="btn ms-auto d-inline-flex align-items-center gap-2"
          style={{ ...btnPrimaryStyle, background: colors.authGreen, borderColor: colors.authGreen, height: 44, padding: '0 1.25rem' }}
          onClick={() => onNavigate?.('add-food')}
        >
          <Plus size={18} /> Add Food Items
        </button>
      </div>

      <div className="rounded-4 p-4" style={{ background: '#fbfaf4', border: `1px solid ${colors.border}` }}>
        {loading ? (
          <div className="text-center py-5" style={{ color: colors.muted }}>Loading inventory…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-5" style={{ color: colors.muted }}>
            {items.length === 0 ? 'No food items yet. Add your first item.' : 'No items match your search or filter.'}
          </div>
        ) : (
          <div className="row g-4">
            {filtered.map((item) => (
              <div className="col-12 col-md-6 col-lg-4" key={item.id}>
                <div className="d-flex gap-3 p-3 rounded-4 h-100" style={{ background: '#eef2e3' }}>
                  <img
                    src={item.imageUrl || DEFAULT_IMAGE}
                    alt={item.name}
                    className="rounded-3 flex-shrink-0"
                    style={{ width: 84, height: 84, objectFit: 'cover' }}
                  />
                  <div className="flex-grow-1">
                    <div className="fw-bold" style={{ textDecoration: 'underline', color: colors.charcoal }}>{item.name}</div>
                    <div className="small" style={{ color: colors.charcoal }}>
                      {item.quantity} {item.quantityUnit} - {item.category}
                    </div>
                    <div className="small" style={{ color: colors.muted }}>Expires {formatDate(item.expiryDate)}</div>

                    <div className="d-flex align-items-center gap-3 mb-2 mt-1">
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        style={{ color: colors.authGreen }}
                        onClick={() => onNavigate?.('edit-food', item)}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        style={{ color: '#c0392b' }}
                        onClick={() => handleDelete(item.id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm flex-grow-1"
                        style={{ background: '#e4e9d8', border: `1px solid ${colors.border}`, borderRadius: 6, fontWeight: 500 }}
                        onClick={() => handleUsed(item.id)}
                      >
                        Used
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm flex-grow-1 text-white"
                        style={{ background: colors.authGreen, borderRadius: 6, fontWeight: 500 }}
                        onClick={() => setDonateTarget(item)}
                      >
                        Donate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DonateModal
        item={donateTarget}
        onCancel={() => setDonateTarget(null)}
        onConfirm={handleDonateConfirm}
      />
    </div>
  );
}