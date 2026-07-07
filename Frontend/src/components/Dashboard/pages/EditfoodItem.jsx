import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { colors, fonts, btnPrimaryStyle, btnOutlineStyle } from '../../../theme';
import { foodApi } from '../../../services/api';

const CATEGORIES = ['Dairy', 'Meat', 'Fruits', 'Vegetable'];
const UNITS = ['Kg', 'Ltr'];

const inputStyle = {
  borderColor: colors.border,
  borderWidth: '1.5px',
  borderRadius: 10,
  fontSize: '0.9rem',
  padding: '0.7rem 1rem',
};

export default function EditFoodItem({ item, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    name: item.name || '',
    category: item.category || '',
    quantity: item.quantity ?? '',
    quantityUnit: item.quantityUnit || 'Kg',
    expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
    imageUrl: item.imageUrl || '',
  });
  const [status, setStatus] = useState('idle');
  const [errMsg, setErrMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErrMsg('Food name is required.'); setStatus('error'); return; }
    if (!form.category) { setErrMsg('Please select a category.'); setStatus('error'); return; }
    if (!form.quantity || Number(form.quantity) <= 0) { setErrMsg('Enter a valid quantity.'); setStatus('error'); return; }
    if (!form.expiryDate) { setErrMsg('Expiry date is required.'); setStatus('error'); return; }

    setStatus('loading');
    setErrMsg('');
    try {
      await foodApi.update(item.id, {
        name: form.name.trim(),
        category: form.category,
        quantity: Number(form.quantity),
        quantityUnit: form.quantityUnit,
        expiryDate: form.expiryDate,
        imageUrl: form.imageUrl.trim() || null,
      });
      setStatus('success');
      setTimeout(() => onSuccess?.(), 600);
    } catch (err) {
      setErrMsg(err.message);
      setStatus('error');
    }
  };

  return (
    <div>
      <button
        type="button"
        className="btn d-inline-flex align-items-center gap-2 mb-3 p-0"
        style={{ color: colors.muted, fontSize: '0.875rem', background: 'none', border: 'none' }}
        onClick={onCancel}
      >
        <ArrowLeft size={16} /> Back to inventory
      </button>

      <h1 style={{ fontFamily: fonts.display, fontSize: '1.75rem', fontWeight: 700, color: colors.charcoal, marginBottom: '0.25rem' }}>
        Edit Food Item
      </h1>
      <p className="mb-4" style={{ color: colors.muted }}>
        Update the details for <strong>{item.name}</strong>.
      </p>

      <div
        className="bg-white border rounded-4 p-4 p-lg-5"
        style={{ borderColor: `${colors.border} !important`, maxWidth: 560 }}
      >
        {status === 'error' && (
          <div className="alert alert-danger py-2 small mb-3">{errMsg}</div>
        )}
        {status === 'success' && (
          <div className="alert alert-success py-2 small mb-3">Changes saved successfully!</div>
        )}

        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <div>
            <label htmlFor="edit-name" className="form-label fw-semibold small">Food name</label>
            <input id="edit-name" name="name" type="text" className="form-control" style={inputStyle}
              placeholder="e.g. Whole Milk" value={form.name} onChange={handleChange} />
          </div>

          <div>
            <label htmlFor="edit-category" className="form-label fw-semibold small">Category</label>
            <select id="edit-category" name="category" className="form-select" style={inputStyle}
              value={form.category} onChange={handleChange}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="row g-3">
            <div className="col-7">
              <label htmlFor="edit-quantity" className="form-label fw-semibold small">Quantity</label>
              <input id="edit-quantity" name="quantity" type="number" min="0.01" step="0.01"
                className="form-control" style={inputStyle} placeholder="e.g. 2"
                value={form.quantity} onChange={handleChange} />
            </div>
            <div className="col-5">
              <label htmlFor="edit-quantityUnit" className="form-label fw-semibold small">Unit</label>
              <select id="edit-quantityUnit" name="quantityUnit" className="form-select" style={inputStyle}
                value={form.quantityUnit} onChange={handleChange}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="edit-expiryDate" className="form-label fw-semibold small">Expiry date</label>
            <input id="edit-expiryDate" name="expiryDate" type="date" className="form-control"
              style={inputStyle} value={form.expiryDate} onChange={handleChange} />
          </div>

          <div>
            <label htmlFor="edit-imageUrl" className="form-label fw-semibold small">
              Image URL <span className="text-muted fw-normal">(optional)</span>
            </label>
            <input id="edit-imageUrl" name="imageUrl" type="url" className="form-control"
              style={inputStyle} placeholder="https://..." value={form.imageUrl} onChange={handleChange} />
          </div>

          <div className="d-flex gap-2 mt-2">
            <button type="submit" className="btn btn-primary flex-grow-1"
              style={{ ...btnPrimaryStyle, padding: '0.75rem' }} disabled={status === 'loading'}>
              {status === 'loading' ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="btn"
              style={{ ...btnOutlineStyle, padding: '0.75rem 1.25rem' }} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}