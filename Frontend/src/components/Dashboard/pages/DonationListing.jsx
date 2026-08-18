import { useCallback, useEffect, useState } from "react";
import { HeartHandshake, Clock } from "lucide-react";
import { colors, fonts, btnPrimaryStyle } from "../../../theme";
import { foodApi } from "../../../services/api";
import { logActivity } from "../../../utils/activitylog";
import DonateModal from "../DonateModal";

const CATEGORY_FALLBACK_IMAGES = {
  Fruits:
    "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=400&fit=crop",
  Vegetable:
    "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=400&h=400&fit=crop",
  Dairy:
    "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&h=400&fit=crop",
  Meat: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=400&fit=crop",
  Other:
    "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400&h=400&fit=crop",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop";

function getFoodImage(item) {
  if (item?.imageUrl && item.imageUrl.trim() !== "") {
    return item.imageUrl;
  }
  return (
    CATEGORY_FALLBACK_IMAGES[item?.category] || CATEGORY_FALLBACK_IMAGES.Other
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
}

function expiryBadge(daysLeft) {
  if (daysLeft === null) return null;
  if (daysLeft <= 0) return { label: "Expires today", color: "#c0392b" };
  if (daysLeft === 1) return { label: "1 day left", color: "#c0392b" };
  return { label: `${daysLeft} days left`, color: "#b78103" };
}

function InlineConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
}) {
  if (!open) return null;

  return (
    <div
      onClick={() => onCancel?.()}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        zIndex: 10000,
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.authBg || "#ffffff",
          color: colors.charcoal,
          borderRadius: 12,
          maxWidth: 540,
          width: "100%",
          padding: "22px 24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          border: `1px solid rgba(0,0,0,0.06)`,
        }}
      >
        {title && (
          <h3
            style={{
              margin: 0,
              fontFamily: fonts.body,
              color: colors.charcoal,
            }}
          >
            {title}
          </h3>
        )}
        <p style={{ marginTop: 10, marginBottom: 16, color: colors.charcoal }}>
          {message}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "none",
              padding: "8px 14px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              color: colors.charcoal,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              background: colors.green,
              color: "#fff",
              border: "none",
              padding: "8px 14px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DonationListing({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [donateTarget, setDonateTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);

  const loadItems = useCallback(async () => {
    setErrMsg("");
    try {
      const data = await foodApi.getDonationListing();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrMsg(err.message || "Failed to load your donation listing.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchItems = async () => {
      setLoading(true);
      if (isMounted) {
        await loadItems();
      }
    };

    fetchItems();

    return () => {
      isMounted = false;
    };
  }, [loadItems]);

  // Final step: "Convert Donation" — collects pickup location, availability,
  // and contact, then makes the item visible in Browse Food Item.
  const handleConvertDonationConfirm = async (details) => {
    await foodApi.donate(donateTarget.id, details);
    logActivity(`Donated ${donateTarget.name}`);
    setItems((prev) => prev.filter((item) => item.id !== donateTarget.id));
    setDonateTarget(null);
    onNavigate?.("browse");
  };

  const handleRevert = (item) => {
    setConfirmPayload({ id: item.id, name: item.name });
    setConfirmOpen(true);
  };

  const doRevert = async (id) => {
    const target = items.find((item) => item.id === id);
    try {
      await foodApi.revertToInventory(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      logActivity(`Reverted ${target?.name || "an item"} to inventory`);
    } catch (err) {
      setErrMsg(err.message || "Failed to revert item to inventory.");
    }
  };

  return (
    <div>
      <h1
        style={{
          fontFamily: fonts.body,
          fontSize: "1.60rem",
          fontWeight: 700,
          color: colors.charcoal,
          marginBottom: "0.25rem",
          opacity: 0.75,
        }}
      >
        Donation Listing
      </h1>
      <p className="mb-4" style={{ color: colors.muted }}>
        Items you've marked to donate. Finish setting them up with pickup
        details, or send them back to your inventory.
      </p>

      {errMsg && (
        <div className="alert alert-danger py-2 small mb-3">{errMsg}</div>
      )}

      <style>
        {`
          @keyframes slideInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .donation-card {
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
          }

          .donation-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08) !important;
          }

          .convert-donation-btn {
            opacity: 0.85;
            transition: opacity 0.2s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
          }

          .convert-donation-btn:hover:not(:disabled) {
            opacity: 1;
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
          }

          .revert-btn {
            transition: all 0.25s ease;
          }

          .revert-btn:hover {
            opacity: 1 !important;
            background: ${colors.greenLrgb};
            border-color: transparent;
          }
          }
        `}
      </style>

      <div
        className="rounded-4 p-4"
        style={{
          background: colors.authGreen,
          border: `2px solid ${colors.greenLrgb}`,
          minHeight: "440px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading ? (
          <div
            className="text-center py-5 my-auto"
            style={{ color: colors.muted }}
          >
            Loading donation listing…
          </div>
        ) : items.length === 0 ? (
          <div
            className="text-center py-5 my-auto d-flex flex-column align-items-center gap-2"
            style={{ color: colors.muted }}
          >
            <HeartHandshake size={32} style={{ opacity: 0.5 }} />
            <div>
              Nothing here yet. From Food Inventory, click{" "}
              <strong>"Convert to Donation"</strong> on an item expiring within
              7 days to add it here.
            </div>
          </div>
        ) : (
          <div className="row g-4" style={{ width: "100%", margin: 0 }}>
            {items.map((item, idx) => {
              const daysLeft = getDaysUntilExpiry(item.expiryDate);
              const badge = expiryBadge(daysLeft);

              return (
                <div
                  className="col-12 col-md-6 col-lg-4 d-flex align-items-stretch"
                  key={item.id}
                >
                  <div
                    className="d-flex gap-3 p-3 rounded-4 w-100 donation-card position-relative"
                    style={{
                      background: colors.low_greenFade,
                      border: `2px solid ${colors.greenLrgb}`,
                      animation: `slideInUp 0.6s ease-out ${idx * 0.05}s backwards`,
                    }}
                  >
                    <img
                      src={getFoodImage(item)}
                      alt={item.name}
                      className="rounded-3 flex-shrink-0"
                      style={{
                        width: 90,
                        height: 90,
                        objectFit: "cover",
                        backgroundColor: colors.white,
                      }}
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />

                    <div
                      className="d-flex flex-column flex-grow-1"
                      style={{ minWidth: 0 }}
                    >
                      <div className="d-flex align-items-center justify-content-between gap-1 mb-1">
                        <div
                          className="fw-bold text-truncate"
                          style={{
                            color: colors.greenD,
                            fontSize: "0.98rem",
                          }}
                          title={item.name}
                        >
                          {item.name}
                        </div>
                        {badge && (
                          <span
                            className="d-inline-flex align-items-center gap-1 flex-shrink-0"
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 600,
                              color: colors.charcoal,
                              opacity: 0.7,
                              backgroundColor: colors.showcase_green,
                              padding: "2px 6px",
                              borderRadius: 4,
                            }}
                          >
                            <Clock size={10} /> {badge.label}
                          </span>
                        )}
                      </div>

                      <div
                        className="small fw-medium"
                        style={{ color: colors.charcoal }}
                      >
                        {item.quantity} {item.quantityUnit} - {item.category}
                      </div>
                      <div
                        className="small mb-3"
                        style={{ color: colors.muted, fontSize: "0.78rem" }}
                      >
                        Expires {formatDate(item.expiryDate)}
                      </div>

                      <div className="d-flex gap-2 mt-auto">
                        <button
                          type="button"
                          className="btn btn-sm flex-grow-1 revert-btn"
                          style={{
                            background: "transparent",
                            border: `2px solid ${colors.greenL}`,
                            color: colors.charcoal,
                            fontWeight: 600,
                            borderRadius: 4,
                            padding: "0.45rem",
                            fontSize: "0.85rem",
                          }}
                          onClick={() => handleRevert(item)}
                        >
                          Revert
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm flex-grow-1 convert-donation-btn"
                          style={{
                            ...btnPrimaryStyle,
                            borderRadius: 4,
                            fontWeight: 600,
                            padding: "0.45rem",
                            fontSize: "0.85rem",
                            color: colors.white,
                          }}
                          onClick={() => setDonateTarget(item)}
                        >
                          Confirm Donation
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DonateModal
        item={donateTarget}
        onCancel={() => setDonateTarget(null)}
        onConfirm={handleConvertDonationConfirm}
      />

      <InlineConfirmDialog
        open={confirmOpen}
        title="Revert to Food Inventory"
        message={`Move "${confirmPayload?.name}" back to your Food Inventory? It will no longer be in your Donation Listing.`}
        confirmLabel="Revert"
        cancelLabel="Cancel"
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmPayload(null);
        }}
        onConfirm={async () => {
          const payload = confirmPayload;
          setConfirmOpen(false);
          setConfirmPayload(null);
          if (!payload) return;
          await doRevert(payload.id);
        }}
      />
    </div>
  );
}
