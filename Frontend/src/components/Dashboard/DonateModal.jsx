// src/components/Dashboard/DonateModal.jsx
import { useEffect, useState } from 'react';
import { colors, fonts } from '../../theme';
import { getStoredUser } from '../../utils/auth';

const fieldBoxStyle = {
  border: `1.5px solid ${colors.border}`,
  borderRadius: 10,
  padding: '0.65rem 0.9rem',
  fontFamily: '"Courier New", monospace',
  fontSize: '0.95rem',
  color: colors.charcoal,
  background: '#fff',
  width: '100%',
};

const labelStyle = {
  fontWeight: 700,
  fontSize: '0.95rem',
  color: colors.charcoal,
  marginBottom: '0.5rem',
  display: 'block',
};

export default function DonateModal({ item, onCancel, onConfirm }) {
  // Read the stored user ONCE (lazy initializer), not on every render.
  // getStoredUser() does JSON.parse() internally, which returns a brand-new
  // object reference every call — if that were re-read every render and used
  // as an effect dependency, the effect would re-fire on every keystroke and
  // wipe out whatever you just typed. This is what was happening before.
  const [user] = useState(() => getStoredUser());

  const [location, setLocation] = useState('');
  const [availableTime, setAvailableTime] = useState('');
  const [contactDetail, setContactDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Only reset the form when a NEW item is opened for donation — not on every render.
  useEffect(() => {
    if (item) {
      setLocation(user?.location || user?.address || '');
      setAvailableTime('');
      setContactDetail(user?.phone || user?.contact || '');
      setErrMsg('');
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  if (!item) return null;

  const handleDonateClick = async () => {
    if (!location.trim()) return setErrMsg('Please enter a pickup location.');
    if (!availableTime.trim()) return setErrMsg('Please enter your available time.');
    if (!contactDetail.trim()) return setErrMsg('Please enter a contact detail.');

    setErrMsg('');
    setSubmitting(true);
    try {
      await onConfirm({
        location: location.trim(),
        availableTime: availableTime.trim(),
        contactDetail: contactDetail.trim(),
      });
    } catch (err) {
      setErrMsg(err.message || 'Failed to donate item. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: 'rgba(0,0,0,0.45)', zIndex: 1060 }}
      onClick={() => !submitting && onCancel?.()}
    >
      <div
        className="rounded-4 p-4 p-sm-5"
        style={{ background: '#fbfaf1', border: `1px solid ${colors.border}`, maxWidth: 460, width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 style={{ fontFamily: fonts.display, color: colors.charcoal, marginBottom: '1.5rem' }}>
          Donate {item.name ? `"${item.name}"` : 'Item'}
        </h4>

        {errMsg && <div className="alert alert-danger py-2 small mb-3">{errMsg}</div>}

        <div className="mb-4">
          <label style={labelStyle}>Location</label>
          <input
            type="text"
            style={fieldBoxStyle}
            placeholder="Kathmandu, Nepal"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label style={labelStyle}>Available Time</label>
          <input
            type="text"
            style={fieldBoxStyle}
            placeholder="10:00 AM - 5:00 PM"
            value={availableTime}
            onChange={(e) => setAvailableTime(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label style={labelStyle}>Contact Detail:</label>
          <input
            type="text"
            style={fieldBoxStyle}
            placeholder="01 - 12345678"
            value={contactDetail}
            onChange={(e) => setContactDetail(e.target.value)}
          />
        </div>

        <div className="d-flex justify-content-center gap-3 mt-4">
          <button
            type="button"
            className="btn px-4 fw-bold"
            style={{ background: colors.authGreen, borderColor: colors.authGreen, color: 'white', borderRadius: 8, fontFamily: '"Courier New", monospace' }}
            onClick={handleDonateClick}
            disabled={submitting}
          >
            {submitting ? 'Donating…' : 'Donate'}
          </button>
          <button
            type="button"
            className="btn px-4 fw-bold"
            style={{ background: 'transparent', border: `1.5px solid ${colors.authGreen}`, color: colors.authGreen, borderRadius: 8, fontFamily: '"Courier New", monospace' }}
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}