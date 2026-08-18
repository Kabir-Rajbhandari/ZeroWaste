import { useEffect, useState } from "react";
import { colors, fonts, btnPrimaryStyle } from "../../theme";
import {
  getDonationDetailsCookie,
  getStoredUser,
  setDonationDetailsCookie,
} from "../../utils/auth";

const fieldBoxStyle = {
  border: `2px solid ${colors.greenL}`,
  borderRadius: 6,
  padding: "0.65rem 0.9rem",
  fontFamily: fonts.body,
  fontSize: "0.95rem",
  color: colors.charcoal,
  background: colors.white,
  width: "100%",
};

const labelStyle = {
  fontWeight: 500,
  fontSize: "1rem",
  color: colors.charcoal,
  marginBottom: "0.5rem",
  display: "block",
};

export default function DonateModal({ item, onCancel, onConfirm }) {
  const [user] = useState(() => getStoredUser());
  const [prevItemId, setPrevItemId] = useState(item?.id);

  const [location, setLocation] = useState(() => {
    const cookieDetails = getDonationDetailsCookie();
    return cookieDetails?.location || user?.location || user?.address || "";
  });
  const [availableTime, setAvailableTime] = useState(() => {
    const cookieDetails = getDonationDetailsCookie();
    return cookieDetails?.availableTime || "";
  });
  const [contactDetail, setContactDetail] = useState(() => {
    const cookieDetails = getDonationDetailsCookie();
    return cookieDetails?.contactDetail || user?.phone || user?.contact || "";
  });
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // Adjust state during render when item changes to avoid cascading useEffect renders
  if (item && item.id !== prevItemId) {
    setPrevItemId(item.id);
    const cookieDetails = getDonationDetailsCookie();
    setLocation(
      cookieDetails?.location || user?.location || user?.address || "",
    );
    setAvailableTime(cookieDetails?.availableTime || "");
    setContactDetail(
      cookieDetails?.contactDetail || user?.phone || user?.contact || "",
    );
    setErrMsg("");
    setSubmitting(false);
  }

  useEffect(() => {
    if (!item) return;
    const draft = {
      location: location.trim(),
      availableTime: availableTime.trim(),
      contactDetail: contactDetail.trim(),
    };
    if (draft.location || draft.availableTime || draft.contactDetail) {
      setDonationDetailsCookie(draft);
    }
  }, [item, location, availableTime, contactDetail]);

  if (!item) return null;

  const handleDonateClick = async () => {
    if (!location.trim()) return setErrMsg("Please enter a pickup location.");
    if (!availableTime.trim())
      return setErrMsg("Please enter your available time.");
    if (!contactDetail.trim())
      return setErrMsg("Please enter a contact detail.");

    setErrMsg("");
    setSubmitting(true);
    try {
      await onConfirm({
        location: location.trim(),
        availableTime: availableTime.trim(),
        contactDetail: contactDetail.trim(),
      });
    } catch (err) {
      setErrMsg(err.message || "Failed to donate item. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(0,0,0,0.40)", zIndex: 99 }}
      onClick={() => !submitting && onCancel?.()}
    >
      <style>
        {`
          .donate-btn {
            opacity: 0.85;
            transition: opacity 0.2s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
          }

          .donate-btn:hover:not(:disabled) {
            opacity: 1;
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
          }


          .cancel-btn:hover{
            opacity: 1 !important;
          }
        `}
      </style>
      <div
        className="rounded-4 p-4 p-sm-5"
        style={{
          background: colors.authBg,
          border: "none",
          maxWidth: 460,
          width: "92%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h4
          style={{
            fontFamily: fonts.body,
            color: colors.charcoal,
            marginBottom: "1.2rem",
          }}
        >
          Donate {item.name ? `"${item.name}"` : "Item"}
        </h4>

        {errMsg && (
          <div className="alert alert-danger py-2 small mb-3">{errMsg}</div>
        )}

        <div className="mb-4">
          <label style={labelStyle}>Location</label>
          <input
            className="textField"
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
            className="textField"
            type="text"
            style={fieldBoxStyle}
            placeholder="10:00 AM - 5:00 PM"
            value={availableTime}
            onChange={(e) => setAvailableTime(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label style={labelStyle}>Contact Detail</label>
          <input
            type="text"
            className="textField"
            style={fieldBoxStyle}
            placeholder="01 - 12345678"
            value={contactDetail}
            onChange={(e) => setContactDetail(e.target.value)}
          />
        </div>

        <div className="d-flex justify-content-center gap-3 mt-4">
          <button
            type="button"
            className="btn px-4 fw-bold donate-btn"
            style={{
              ...btnPrimaryStyle,
              borderRadius: 4,
              fontWeight: 400,
              padding: "0.45rem",
              fontSize: "0.85rem",
              color: colors.white,
            }}
            onClick={handleDonateClick}
            disabled={submitting}
          >
            Donate
          </button>
          <button
            type="button"
            className="btn px-4 fw-bold cancel-btn"
            style={{
              opacity: 0.65,
              color: colors.charcoal,
              fontWeight: 600,
              borderRadius: 4,
              border: "none",
              padding: "0.45rem 1.25rem",
              fontSize: "0.9rem",
              transition: "all 0.5s ease",
            }}
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
