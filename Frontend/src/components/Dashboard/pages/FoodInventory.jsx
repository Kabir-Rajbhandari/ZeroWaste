import { useCallback, useEffect, useState } from "react";
import {
  Search,
  ChevronsRight,
  ChevronsLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  UtensilsCrossed,
} from "lucide-react";
import { colors, fonts, btnPrimaryStyle } from "../../../theme";
import { foodApi } from "../../../services/api";
import { logActivity } from "../../../utils/activitylog";

const CATEGORIES = [
  "All Categories",
  "Fruits",
  "Vegetable",
  "Dairy",
  "Meat",
  "Other",
];

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

function InlineConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  showCancel = true,
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
          background: colors.authBg || colors.white,
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
          {showCancel && (
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
          )}
          <button
            className="btn-convert"
            type="button"
            onClick={onConfirm}
            style={{
              backgroundColor: colors.green,
              color: colors.white,
              border: `2px solid ${colors.greenL}`,
              fontSize: "0.9rem",
              borderRadius: 4,
              padding: "8px 14px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 9;

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// The backend phrases reservation-conflict errors as "... is reserved for
// ...", so this is used to route them to the same popup treatment as the
// donation-eligibility check, rather than the plain top error banner.
function isReservationError(err) {
  return (
    typeof err?.message === "string" && err.message.includes("is reserved for")
  );
}

export default function FoodInventory({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);
  const [infoDialog, setInfoDialog] = useState(null);
  const [page, setPage] = useState(1);

  const loadItems = useCallback(async () => {
    setErrMsg("");
    try {
      const data = await foodApi.getAll();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrMsg(err.message || "Failed to load food items.");
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

  const handleDelete = async (id) => {
    const target = items.find((item) => item.id === id);
    if (target?.reserved) {
      setInfoDialog({
        title: "This item is reserved",
        message: `"${target.name}" is currently reserved for a planned meal. Unlink it from your Meal Planner before removing it.`,
      });
      return;
    }
    setConfirmPayload({ type: "delete", id });
    setConfirmOpen(true);
  };

  const doDelete = async (id) => {
    const target = items.find((item) => item.id === id);
    try {
      await foodApi.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      logActivity(`Removed ${target?.name || "an item"}`);
    } catch (err) {
      // A reserved item can't be deleted — show it as a popup (same
      // treatment as the donation-eligibility message below) instead of
      // just the top banner, since it needs the person's attention.
      if (isReservationError(err)) {
        setInfoDialog({
          title: "This item is reserved",
          message: err.message,
        });
        return;
      }
      setErrMsg(err.message || "Failed to delete item.");
    }
  };

  const handleUsed = async (id) => {
    setConfirmPayload({ type: "used", id });
    setConfirmOpen(true);
  };

  const doMarkUsed = async (id) => {
    const target = items.find((item) => item.id === id);
    try {
      await foodApi.markUsed(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      logActivity(`Used ${target?.name || "an item"}`);
    } catch (err) {
      setErrMsg(err.message || "Failed to mark item as used.");
    }
  };

  // Days remaining until an item's expiry date (negative/0 = expired/today).
  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
  };

  // UC step: "User selects item nearing expiry and clicks 'Convert to
  // Donation.'" Eligible from today's date (0 days left, i.e. expires today
  // — still fine to eat/donate today) through 7 days before expiry. Anything
  // else (already past its expiry date, or too far out) pops an interactive
  // message instead of hitting the API.
  const handleConvertToDonation = (item) => {
    if (item.reserved) {
      setInfoDialog({
        title: "This item is reserved",
        message: `"${item.name}" is currently reserved for a planned meal. Unlink it from your Meal Planner before donating it.`,
      });
      return;
    }

    const daysLeft = getDaysUntilExpiry(item.expiryDate);
    const eligible = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

    if (!eligible) {
      setInfoDialog({
        title: "Not eligible for donation yet",
        message:
          daysLeft !== null && daysLeft < 0
            ? `"${item.name}" has already expired, so it can no longer be listed for donation.`
            : `"${item.name}" isn't close enough to its expiry date yet. Items can only be listed for donation once they're within 7 days of expiring.`,
      });
      return;
    }

    setConfirmPayload({
      type: "list-for-donation",
      id: item.id,
      name: item.name,
    });
    setConfirmOpen(true);
  };

  const doListForDonation = async (id) => {
    const target = items.find((item) => item.id === id);
    try {
      await foodApi.listForDonation(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      logActivity(`Listed ${target?.name || "an item"} for donation`);
      onNavigate?.("donation-listing");
    } catch (err) {
      if (isReservationError(err)) {
        setInfoDialog({
          title: "This item is reserved",
          message: err.message,
        });
        return;
      }
      setErrMsg(err.message || "Failed to list item for donation.");
    }
  };

  const filtered = items.filter((item) => {
    const matchesSearch =
      !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      category === "All Categories" || item.category === category;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

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
        Food Inventory
      </h1>
      <p className="mb-4" style={{ color: colors.muted }}>
        Stay organized with a complete view of your food inventory.
      </p>

      {errMsg && (
        <div className="alert alert-danger py-2 small mb-3">{errMsg}</div>
      )}

      <style>
        {`
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .food-card {
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
          }

          .food-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08) !important;
          }

          .search {
            outline: none;
            border-color: ${colors.greenL};
          }

          .search:focus {
            border-color: ${colors.greenLrgb};
            box-shadow: 0 0 0 0.23rem ${colors.greenLrgb};
          }

          .add-item, .btn-convert {
            opacity: 0.75;
            transition: opacity 0.2s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
          }

          .add-item:hover:not(:disabled) {
            opacity: 1;
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
          }

          .btn-convert:hover:not(:disabled) {
            background: ${colors.greenLrgb};
            opacity: 1;
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
          }

          .page-btn {
            transition: all 0.15s ease;
          }

          .page-btn:hover:not(:disabled) {
            opacity: 0.85;
          }

          .convert-donation-btn {
            opacity: 0.85;
            transition: opacity 0.2s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
          }

          .convert-donation-btn:hover:not(:disabled) {
            opacity: 1;
            background: ${colors.greenLrgb};
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);

          }

          .used-btn {
            transition: all 0.25s ease;
          }

          .used-btn:hover {
            opacity: 1 !important;
            background: ${colors.greenLrgb};
            border-color: transparent;
          }

          .action-icon-btn {
            transition: transform 0.2s ease, opacity 0.2s ease;
            opacity: 0.8;
          }

          .action-icon-btn:hover {
            transform: scale(1.15);
            opacity: 1;
          }
        `}
      </style>

      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        <div
          className="position-relative flex-grow-1"
          style={{ maxWidth: 300 }}
        >
          <Search
            size={22}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: colors.muted,
            }}
          />
          <input
            type="text"
            className="form-control search"
            style={{
              borderWidth: "2px",
              paddingLeft: "2.4rem",
              borderRadius: 7,
              height: 50,
            }}
            placeholder="Search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="position-relative">
          <select
            className="form-select fw-semibold category"
            style={{
              borderColor: colors.green,
              borderWidth: "2px",
              opacity: 0.7,
              borderRadius: 4,
              height: 50,
              width: 170,
              paddingRight: "2.2rem",
              transition: "all 0.15s ease",
              boxShadow: "none",
              backgroundImage: "none",
            }}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <ChevronRight
            className="category"
            size={20}
            style={{
              background: colors.white,
              opacity: 0.8,
              position: "absolute",
              right: 12,
              top: "50%",
              transform: `translateY(-50%) rotate(${isOpen ? 90 : 0}deg)`,
              transition: "transform 0.15s ease",
              pointerEvents: "none",
            }}
          />
        </div>

        <button
          type="button"
          className="btn ms-auto d-inline-flex align-items-center gap-2 add-item"
          style={{
            ...btnPrimaryStyle,
            color: colors.white,
            fontWeight: 600,
            padding: "0.45rem 1.15rem",
            fontSize: "0.9rem",
            height: 50,
            borderRadius: 4,
          }}
          onClick={() => onNavigate?.("add-food")}
        >
          <Plus size={18} /> Add Food Items
        </button>
      </div>

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
            Loading inventory…
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-5 my-auto"
            style={{ color: colors.muted }}
          >
            {items.length === 0
              ? "No food items yet. Add your first item."
              : "No items match your search or filter."}
          </div>
        ) : (
          <div className="row g-4" style={{ width: "100%", margin: 0 }}>
            {paginatedItems.map((item, idx) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const expiry = item.expiryDate ? new Date(item.expiryDate) : null;
              const isExpired = expiry && expiry < today && !item.donated;

              return (
                <div
                  className="col-12 col-md-6 col-lg-4 d-flex align-items-stretch"
                  key={item.id}
                >
                  <div
                    className="d-flex gap-3 p-3 rounded-4 w-100 food-card position-relative"
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
                        {item.reserved && (
                          <span
                            className="d-inline-flex align-items-center gap-1 flex-shrink-0"
                            title="Linked to a planned meal"
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              color: colors.greenD,
                              backgroundColor: colors.authGreen,
                              padding: "2px 6px",
                              borderRadius: 4,
                            }}
                          >
                            <UtensilsCrossed size={10} /> Reserved
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
                        className="small mb-2"
                        style={{ color: colors.muted, fontSize: "0.78rem" }}
                      >
                        Expires {formatDate(item.expiryDate)}
                      </div>

                      <div className="d-flex align-items-center gap-3 mb-2">
                        <button
                          type="button"
                          className="btn btn-link p-0 action-icon-btn"
                          style={{ color: colors.greenL }}
                          onClick={() => onNavigate?.("edit-food", item)}
                          title="Edit"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-link p-0 action-icon-btn"
                          style={{ color: colors.greenL }}
                          onClick={() => onNavigate?.("meal-planner", item)}
                          title="Plan for Meal"
                        >
                          <UtensilsCrossed size={17} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-link p-0 action-icon-btn"
                          style={{ color: "#c0392b" }}
                          onClick={() => handleDelete(item.id)}
                          title="Delete"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>

                      <div className="d-flex gap-2 mt-auto">
                        {isExpired ? (
                          <button
                            type="button"
                            className="btn btn-sm flex-grow-1"
                            style={{
                              background: "#c0392b",
                              border: "none",
                              color: colors.white,
                              fontSize: "0.85rem",
                              fontWeight: 500,
                              borderRadius: 4,
                              padding: "0.45rem",
                            }}
                            disabled
                          >
                            Expired
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm flex-grow-1 used-btn"
                              style={{
                                opacity: 1,
                                borderColor: colors.green,
                                color: colors.charcoal,
                                fontWeight: 600,
                                borderRadius: 4,
                                borderWidth: "2px",
                                padding: "0.45rem",
                                fontSize: "0.88rem",
                              }}
                              onClick={() => handleUsed(item.id)}
                            >
                              Used
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm flex-grow-1 convert-donation-btn"
                              style={{
                                backgroundColor: colors.green,
                                color: colors.white,
                                border: `2px solid ${colors.greenL}`,
                                borderRadius: 4,
                                fontWeight: 600,
                                padding: "0.45rem",
                                fontSize: "0.88rem",
                              }}
                              onClick={() => handleConvertToDonation(item)}
                            >
                              Convert to Donation
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && totalPages > 1 && (
        <div className="d-flex align-items-center justify-content-end gap-3 mt-4">
          <button
            type="button"
            className="btn btn-sm p-1 page-btn"
            style={{
              color: currentPage === 1 ? colors.border : colors.charcoal,
              background: "none",
              border: `2px solid ${colors.greenLrgb}`,
            }}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronsLeft size={20} />
          </button>
          <span className="fw-semibold" style={{ color: colors.charcoal }}>
            {currentPage}
          </span>
          <button
            type="button"
            className="btn btn-sm p-1 page-btn"
            style={{
              color:
                currentPage === totalPages ? colors.border : colors.charcoal,
              background: "none",
              border: `2px solid ${colors.greenLrgb}`,
            }}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <ChevronsRight size={20} />
          </button>
        </div>
      )}

      <InlineConfirmDialog
        open={confirmOpen}
        title={
          confirmPayload?.type === "delete"
            ? "Delete item"
            : confirmPayload?.type === "list-for-donation"
              ? "Convert to Donation"
              : "Mark as used"
        }
        message={
          confirmPayload?.type === "delete"
            ? "Delete this food item?"
            : confirmPayload?.type === "list-for-donation"
              ? `Move "${confirmPayload?.name}" to your Donation Listing? From there you can add pickup details and finish creating the donation, or revert it back to your inventory.`
              : "Mark this item as used? It will be removed from your inventory and counted toward Food Saved."
        }
        confirmLabel={
          confirmPayload?.type === "delete"
            ? "Delete"
            : confirmPayload?.type === "list-for-donation"
              ? "Convert"
              : "OK"
        }
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
          if (payload.type === "delete") await doDelete(payload.id);
          if (payload.type === "used") await doMarkUsed(payload.id);
          if (payload.type === "list-for-donation")
            await doListForDonation(payload.id);
        }}
      />
      <InlineConfirmDialog
        open={!!infoDialog}
        title={infoDialog?.title}
        message={infoDialog?.message}
        confirmLabel="Got it"
        showCancel={false}
        onConfirm={() => setInfoDialog(null)}
        onCancel={() => setInfoDialog(null)}
      />
    </div>
  );
}
