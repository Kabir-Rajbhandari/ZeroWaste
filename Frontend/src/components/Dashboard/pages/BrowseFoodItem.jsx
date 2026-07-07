// src/components/Dashboard/pages/BrowseFoodItem.jsx
import { useEffect, useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { colors, fonts } from '../../../theme';
import { foodApi } from '../../../services/api';

const CATEGORIES = ['All Categories', 'Fruits', 'Vegetable', 'Dairy', 'Meat'];

export default function BrowseFoodItem() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
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

    loadItems();
  }, []);

  const filtered = items.filter((item) => {
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All Categories' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <h1 style={{ fontFamily: fonts.display, fontSize: '1.85rem', fontWeight: 700, color: colors.charcoal, marginBottom: '0.25rem' }}>
        Browse Food Items
      </h1>
      <p className="mb-4" style={{ color: colors.muted }}>
        Browse food items donated by other households.
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
          <div className="row g-4">
            {filtered.map((item) => (
              <div className="col-12 col-md-6 col-lg-4" key={item.id}>
                <div className="p-3 rounded-4 h-100" style={{ background: '#eef2e3' }}>
                  <div className="fw-bold" style={{ color: colors.charcoal }}>{item.name}</div>
                  <div className="small" style={{ color: colors.charcoal }}>
                    {item.quantity} {item.quantityUnit} - {item.category}
                  </div>
                  <div className="small" style={{ color: colors.muted }}>
                    Expires {new Date(item.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
