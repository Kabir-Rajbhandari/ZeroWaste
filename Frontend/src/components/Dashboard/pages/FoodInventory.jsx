import { useCallback, useEffect, useState } from "react";
import {
  Search,
  ChevronsRight,
  ChevronsLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { colors, fonts, btnPrimaryStyle } from "../../../theme";
import { foodApi } from "../../../services/api";
import { logActivity } from "../../../utils/activitylog";
import DonateModal from "../DonateModal";

// Inline confirm dialog component for FoodInventory.
// Kept inside this file for easy recognition and to avoid creating a separate shared folder.
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

const CATEGORIES = [
  "All Categories",
  "Fruits",
  "Vegetable",
  "Dairy",
  "Meat",
  "Other",
];

const ITEMS_PER_PAGE = 6;

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function FoodInventory({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [donateTarget, setDonateTarget] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);
  const [page, setPage] = useState(1);

  const loadItems = useCallback(async () => {
    setLoading(true);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadItems();
  }, [loadItems]);

  const handleDelete = async (id) => {
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

  const handleDonateConfirm = async (details) => {
    await foodApi.donate(donateTarget.id, details);
    logActivity(`Donated ${donateTarget.name}`);
    setItems((prev) => prev.filter((item) => item.id !== donateTarget.id));
    setDonateTarget(null);
    onNavigate?.("browse");
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
          .search{
          outline:none;
            border-color: ${colors.greenL};
          }
          .search:focus{
            border-color: ${colors.greenLrgb};
            box-shadow: 0 0 0 0.23rem ${colors.greenLrgb};
          }
          
            .add-item {
            opacity: 0.75;
            transition: opacity 0.2s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
          }

          .add-item:hover:not(:disabled) {
            opacity: 1;
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
          }

          .page-btn{
            transition: all 0.15s ease;
          }

          .page-btn:hover:not(:disabled){
            opacity:0.85;
          }

          .donate-btn {
            opacity: 0.75;
            transition: opacity 0.2s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
          }

          .donate-btn:hover:not(:disabled) {
            opacity: 1;
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
          }

          .used-btn:hover{
            opacity: 1 !important;
            background:${colors.greenLrgb};
            border-color: transparent;
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
            onChange={(e) => setSearch(e.target.value)}
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
            onChange={(e) => setCategory(e.target.value)}
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
        }}
      >
        {loading ? (
          <div className="text-center py-5" style={{ color: colors.muted }}>
            Loading inventory…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-5" style={{ color: colors.muted }}>
            {items.length === 0
              ? "No food items yet. Add your first item."
              : "No items match your search or filter."}
          </div>
        ) : (
          <div
            className="row g-4"
            style={{ alignSelf: "flex-start", width: "100%" }}
          >
            {paginatedItems.map((item) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const expiry = item.expiryDate ? new Date(item.expiryDate) : null;
              const isExpired = expiry && expiry < today && !item.donated;
              return (
                <div className="col-12 col-md-6 col-lg-4" key={item.id}>
                  <div
                    className="d-flex gap-3 p-3 rounded-4 h-100"
                    style={{
                      background: colors.low_greenFade,
                      boxShadow: "0 0px 5px rgb(169, 169, 169)",
                    }}
                  >
                    <img
                      src={item.imageUrl || DEFAULT_IMAGE}
                      alt={item.name}
                      className="rounded-3 flex-shrink-0"
                      style={{ width: 90, height: 84, objectFit: "contain" }}
                    />
                    <div className="flex-grow-1">
                      <div
                        className="fw-bold"
                        style={{
                          color: colors.greenD,
                        }}
                      >
                        {item.name}
                      </div>
                      <div className="small" style={{ color: colors.charcoal }}>
                        {item.quantity} {item.quantityUnit} - {item.category}
                      </div>
                      <div className="small" style={{ color: colors.muted }}>
                        Expires {formatDate(item.expiryDate)}
                      </div>

                      <div className="d-flex align-items-center gap-3 mb-2 mt-1">
                        <button
                          type="button"
                          className="btn btn-link p-0"
                          style={{ color: colors.greenL }}
                          onClick={() => onNavigate?.("edit-food", item)}
                          title="Edit"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-link p-0"
                          style={{ color: "#c0392b" }}
                          onClick={() => handleDelete(item.id)}
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="d-flex gap-4">
                        {isExpired ? (
                          <button
                            type="button"
                            className="btn btn-sm flex-grow-1"
                            style={{
                              background: "#c0392b",
                              border: "none",
                              color: colors.white,
                              boxShadow: "0 0px 5px rgb(169, 169, 169)",
                              fontSize: "0.85rem",
                              fontWeight: 500,
                              borderRadius: 4,
                              padding: "0.45rem 1.15rem",
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
                                padding: "0.45rem 1.25rem",
                                fontSize: "0.9rem",
                                transition: "all 0.5s ease",
                              }}
                              onClick={() => handleUsed(item.id)}
                            >
                              Used
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm flex-grow-1 donate-btn"
                              style={{
                                ...btnPrimaryStyle,
                                borderRadius: 4,
                                fontWeight: 600,
                                padding: "0.45rem 1.15rem",
                                fontSize: "0.9rem",
                                color: colors.white,
                                transition: "all 0.5s ease",
                              }}
                              onClick={() => setDonateTarget(item)}
                            >
                              Donate
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
            className="btn btn-sm p-1"
            style={{
              color: currentPage === 1 ? colors.border : colors.charcoal,
              background: "none",
              border: "none",
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
            className="btn btn-sm p-1"
            style={{
              color:
                currentPage === totalPages ? colors.border : colors.charcoal,
              background: "none",
              border: "none",
            }}
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
      <InlineConfirmDialog
        open={confirmOpen}
        title={
          confirmPayload?.type === "delete" ? "Delete item" : "Mark as used"
        }
        message={
          confirmPayload?.type === "delete"
            ? "Delete this food item?"
            : "Mark this item as used? It will be removed from your inventory and counted toward Food Saved."
        }
        confirmLabel={confirmPayload?.type === "delete" ? "Delete" : "OK"}
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
        }}
      />
    </div>
  );
}
