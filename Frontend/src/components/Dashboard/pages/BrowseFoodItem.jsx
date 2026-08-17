import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  User,
  ArrowLeft,
  Clock,
  RotateCcw,
  Filter,
} from "lucide-react";
import { colors, fonts, btnPrimaryStyle } from "../../../theme";
import { foodApi, resolveAssetUrl } from "../../../services/api";
import { logActivity } from "../../../utils/activitylog";
import DonateModal from "../DonateModal";

const CATEGORIES = [
  "All Categories",
  "Fruits",
  "Vegetable",
  "Dairy",
  "Meat",
  "Other",
];

const STORAGE_TYPES = ["All Storage Types", "Pantry", "Fridge", "Freezer"];

const EXPIRY_OPTIONS = [
  "All Expiry Dates",
  "Expired",
  "Expiring Today",
  "Expiring in 7 Days",
  "Expiring in 30 Days",
];

const PAGE_SIZE = 9;

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
  const parsedDate = new Date(dateStr);
  if (isNaN(parsedDate.getTime())) return "—";
  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getDaysLeft(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const diff = target.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function getDonorName(item) {
  return (
    item.donorName ||
    item.donor ||
    item.ownerName ||
    item.userName ||
    item.username ||
    "Anonymous"
  );
}

function getLocation(item) {
  return (
    item.pickupLocation ||
    item.location ||
    item.city ||
    item.address ||
    "Location not specified"
  );
}

function getAvailableTime(item) {
  return item.availableTime || item.pickupTime || "Not specified";
}

function getContactDetail(item) {
  return item.contactDetail || item.contact || item.phone || "Not provided";
}

function getDisplayName(item) {
  if (!item.isOwn) return item.name;
  return `${item.name} (${item.donorPublic === false ? "Private" : "Public"})`;
}

function getStorageTypeValue(item) {
  return (item?.storageType || item?.storage_type || item?.storage || "")
    .toString()
    .trim();
}

export default function BrowseFoodItem({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("All Expiry Dates");
  const [storageType, setStorageType] = useState("All Storage Types");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [page, setPage] = useState(1);

  const [selectedItem, setSelectedItem] = useState(null);
  const [showContact, setShowContact] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [donorAvatarError, setDonorAvatarError] = useState(false);

  // UC3, "Decide What to Do With the Food": Mark as Used / Plan for Meal /
  // Flag for Donation — the three actions available on an item the user
  // owns, reachable right from its detail view here in Browse Food Items.
  const [donateTarget, setDonateTarget] = useState(null);
  const [confirmingUsed, setConfirmingUsed] = useState(false);
  const [markingUsed, setMarkingUsed] = useState(false);
  const [actionErr, setActionErr] = useState("");

  const refreshItems = async () => {
    try {
      const data = await foodApi.browse();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // Non-critical: the action itself already succeeded: the list will
      // just stay slightly stale until the next natural reload.
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadItems = async () => {
      setLoading(true);
      setErrMsg("");
      try {
        const data = await foodApi.browse();
        if (isMounted) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (isMounted) {
          setErrMsg(err.message || "Failed to load food items.");
          setItems([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadItems();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetAllFilters = () => {
    setSearch("");
    setCategory("All Categories");
    setTypeFilter("all");
    setExpiryFilter("All Expiry Dates");
    setStorageType("All Storage Types");
    setPage(1);
  };

  const hasActiveFilters =
    search !== "" ||
    category !== "All Categories" ||
    typeFilter !== "all" ||
    expiryFilter !== "All Expiry Dates" ||
    storageType !== "All Storage Types";

  // Comprehensive, Fallback-Safe Filter Execution
  const filtered = useMemo(() => {
    return items.filter((item) => {
      // 1. Name & Keyword Search
      const matchesSearch =
        !search.trim() ||
        item.name?.toLowerCase().includes(search.trim().toLowerCase());

      // 2. Category Selection
      const matchesCategory =
        category === "All Categories" ||
        item.category?.toLowerCase() === category.toLowerCase();

      // 3. Inventory vs Donation Toggle
      let matchesType = true;
      const isDonation =
        item.isDonation === true ||
        item.isDonated === true ||
        item.type === "donation" ||
        (item.isOwn === false && Boolean(item.donorName));

      if (typeFilter === "inventory") {
        matchesType = !isDonation || item.isOwn === true;
      } else if (typeFilter === "donations") {
        matchesType = isDonation;
      }

      // 4. Flexible Storage Type Property Evaluation
      const itemStorage = getStorageTypeValue(item).toLowerCase();
      const targetStorage = storageType.toLowerCase();

      const matchesStorage =
        storageType === "All Storage Types" || itemStorage === targetStorage;

      // 5. Expiry Date Range Evaluation
      const daysLeft = getDaysLeft(item.expiryDate);
      let matchesExpiry = true;
      if (daysLeft !== null) {
        if (expiryFilter === "Expired") {
          matchesExpiry = daysLeft < 0;
        } else if (expiryFilter === "Expiring Today") {
          matchesExpiry = daysLeft === 0;
        } else if (expiryFilter === "Expiring in 7 Days") {
          matchesExpiry = daysLeft >= 0 && daysLeft <= 7;
        } else if (expiryFilter === "Expiring in 30 Days") {
          matchesExpiry = daysLeft >= 0 && daysLeft <= 30;
        }
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesType &&
        matchesStorage &&
        matchesExpiry
      );
    });
  }, [items, search, category, typeFilter, storageType, expiryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const openDetails = (item) => {
    setSelectedItem(item);
    setShowContact(false);
    setClaimMsg("");
    setDonorAvatarError(false);
    setConfirmingUsed(false);
    setActionErr("");
  };

  // Branch A — Mark as Used: updates the item's status and contributes to
  // the user's food-saving/impact records (logged server-side as a "USED"
  // activity, which Analytics reads from directly).
  const handleMarkUsed = async () => {
    if (!selectedItem) return;
    setMarkingUsed(true);
    setActionErr("");
    try {
      await foodApi.markUsed(selectedItem.id);
      if (typeof logActivity === "function") {
        logActivity(`Used ${selectedItem.name}`);
      }
      setItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
      setSelectedItem(null);
      setConfirmingUsed(false);
      await refreshItems();
    } catch (err) {
      setActionErr(err.message || "Failed to mark item as used.");
    } finally {
      setMarkingUsed(false);
    }
  };

  // Branch B — Plan for Meal: hands the item off to Meal Planner so it's
  // available to link into a meal slot there.
  const handlePlanForMeal = () => {
    if (!selectedItem) return;
    onNavigate?.("meal-planner", selectedItem);
  };

  // Branch C — Flag for Donation: prompts for pickup location + availability
  // (via the same DonateModal used from Food Inventory), then creates the
  // donation listing.
  const handleDonateConfirm = async (details) => {
    if (!donateTarget) return;
    await foodApi.donate(donateTarget.id, details);
    if (typeof logActivity === "function") {
      logActivity(`Donated ${donateTarget.name}`);
    }
    setItems((prev) => prev.filter((i) => i.id !== donateTarget.id));
    setDonateTarget(null);
    setSelectedItem(null);
    await refreshItems();
  };

  const handleClaim = async () => {
    if (!selectedItem) return;
    setClaiming(true);
    setClaimMsg("");
    try {
      await foodApi.claim(selectedItem.id);
      if (typeof logActivity === "function") {
        logActivity(`Requested ${selectedItem.name}`);
      }
      setClaimMsg(
        "Request sent! The donor will be notified and can accept or decline it.",
      );
      setSelectedItem((prev) =>
        prev ? { ...prev, alreadyRequestedByMe: true } : prev,
      );
      setItems((prev) =>
        prev.map((i) =>
          i.id === selectedItem.id ? { ...i, alreadyRequestedByMe: true } : i,
        ),
      );
    } catch (err) {
      setClaimMsg(
        err.message || "Failed to send claim request. Please try again.",
      );
    } finally {
      setClaiming(false);
    }
  };

  if (selectedItem) {
    const daysLeft = getDaysLeft(selectedItem.expiryDate);
    const daysLeftLabel =
      daysLeft === null
        ? ""
        : daysLeft < 0
          ? " (expired)"
          : daysLeft === 0
            ? " (today)"
            : ` (${daysLeft} day${daysLeft !== 1 ? "s" : ""} left)`;

    const itemStorage = getStorageTypeValue(selectedItem);

    return (
      <div>
        <style>
          {`
            .contact-btn { transition: all 0.25s ease; }
            .contact-btn:hover {
              opacity: 1 !important;
              background: ${colors.greenLrgb};
              border-color: transparent;
            }
            .claim-food {
              opacity: 0.85;
              transition: all 0.25s ease;
            }
            .claim-food:hover:not(:disabled) {
              opacity: 1 !important;
              transform: translateY(-1px);
              box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
            }
          `}
        </style>
        <button
          type="button"
          className="btn btn-link p-0 mb-3 text-decoration-none d-inline-flex align-items-center gap-1"
          style={{ color: colors.charcoal, fontWeight: 600 }}
          onClick={() => setSelectedItem(null)}
        >
          <ArrowLeft size={18} />
          Back to List
        </button>

        <div
          className="rounded-4 p-4"
          style={{
            background: colors.authGreen,
            border: `2px solid ${colors.green}`,
          }}
        >
          <div className="row g-4">
            <div className="col-12 col-md-4">
              <img
                src={getFoodImage(selectedItem)}
                alt={selectedItem.name}
                className="rounded-4 w-100"
                style={{ height: 320, objectFit: "cover" }}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
              />
            </div>

            <div className="col-12 col-md-8">
              <div
                className="d-flex align-items-center justify-content-between"
                style={{
                  borderBottom: `2px solid ${colors.green}`,
                  paddingBottom: "0.6rem",
                }}
              >
                <h2
                  style={{
                    fontFamily: fonts.body,
                    fontWeight: 700,
                    color: colors.charcoal,
                    margin: 0,
                  }}
                >
                  {getDisplayName(selectedItem)}
                </h2>

                {selectedItem.alreadyRequestedByMe && !selectedItem.isOwn && (
                  <span
                    className="d-inline-flex align-items-center gap-1"
                    style={{
                      backgroundColor: "#FFF8E1",
                      color: "#B78103",
                      border: "1px solid #FFE082",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      padding: "0.3rem 0.65rem",
                      borderRadius: "999px",
                    }}
                  >
                    <Clock size={13} />
                    Request Pending
                  </span>
                )}
              </div>

              <div className="d-flex align-items-center gap-2 mt-3 mb-3">
                {selectedItem.donorProfileImageUrl && !donorAvatarError ? (
                  <img
                    src={resolveAssetUrl(selectedItem.donorProfileImageUrl)}
                    alt={getDonorName(selectedItem)}
                    className="rounded-circle"
                    style={{
                      width: 42,
                      height: 42,
                      objectFit: "cover",
                      border: `2px solid ${colors.green}`,
                    }}
                    onError={() => setDonorAvatarError(true)}
                  />
                ) : (
                  <span
                    className="d-inline-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: 42,
                      height: 42,
                      background: colors.greenLrgb,
                      color: colors.white,
                    }}
                  >
                    <User size={24} />
                  </span>
                )}
                <div>
                  <div className="small" style={{ color: colors.muted }}>
                    Donor / Owner
                  </div>
                  <div className="fw-bold" style={{ color: colors.charcoal }}>
                    {getDonorName(selectedItem)}
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-12 col-lg-7">
                  <table
                    className="table table-borderless mb-0"
                    style={{ fontSize: "0.92rem" }}
                  >
                    <tbody>
                      <tr>
                        <td
                          className="ps-0 py-1"
                          style={{ color: colors.muted, width: 130 }}
                        >
                          Quantity
                        </td>
                        <td
                          className="py-1 fw-bold"
                          style={{ color: colors.charcoal }}
                        >
                          {selectedItem.quantity} {selectedItem.quantityUnit}
                        </td>
                      </tr>
                      <tr>
                        <td
                          className="ps-0 py-1"
                          style={{ color: colors.muted }}
                        >
                          Category
                        </td>
                        <td
                          className="py-1 fw-bold"
                          style={{ color: colors.charcoal }}
                        >
                          {selectedItem.category}
                        </td>
                      </tr>
                      {itemStorage && (
                        <tr>
                          <td
                            className="ps-0 py-1"
                            style={{ color: colors.muted }}
                          >
                            Storage
                          </td>
                          <td
                            className="py-1 fw-bold"
                            style={{ color: colors.charcoal }}
                          >
                            {itemStorage}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td
                          className="ps-0 py-1"
                          style={{ color: colors.muted }}
                        >
                          Expiry Date
                        </td>
                        <td
                          className="py-1 fw-bold"
                          style={{ color: colors.charcoal }}
                        >
                          {formatDate(selectedItem.expiryDate)} {daysLeftLabel}
                        </td>
                      </tr>
                      <tr>
                        <td
                          className="ps-0 py-1"
                          style={{ color: colors.muted }}
                        >
                          Location
                        </td>
                        <td
                          className="py-1 fw-bold"
                          style={{ color: colors.charcoal }}
                        >
                          {getLocation(selectedItem)}
                        </td>
                      </tr>
                      <tr>
                        <td
                          className="ps-0 py-1"
                          style={{ color: colors.muted }}
                        >
                          Available Time
                        </td>
                        <td
                          className="py-1 fw-bold"
                          style={{ color: colors.charcoal }}
                        >
                          {getAvailableTime(selectedItem)}
                        </td>
                      </tr>
                      {selectedItem.notes && (
                        <tr>
                          <td
                            className="ps-0 py-1"
                            style={{ color: colors.muted }}
                          >
                            Notes
                          </td>
                          <td
                            className="py-1 fw-bold"
                            style={{ color: colors.charcoal }}
                          >
                            {selectedItem.notes}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="col-12 col-lg-5">
                  <iframe
                    title="Pickup location map"
                    className="rounded-3 w-100"
                    style={{
                      height: 160,
                      border: `2px solid ${colors.green}`,
                    }}
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
                <div
                  className={`alert py-2 small mt-3 mb-0 ${
                    claimMsg.startsWith("Request sent!")
                      ? "alert-success"
                      : "alert-danger"
                  }`}
                >
                  {claimMsg}
                </div>
              )}

              {actionErr && (
                <div className="alert alert-danger py-2 small mt-3 mb-0">
                  {actionErr}
                </div>
              )}

              {selectedItem.isOwn ? (
                <div className="mt-4">
                  <p className="small mb-3" style={{ color: colors.muted }}>
                    This is your own listing —{" "}
                    {selectedItem.donorPublic === false
                      ? "it's currently private."
                      : "it's public for community browsing."}
                  </p>

                  {confirmingUsed ? (
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                      <span
                        className="small fw-medium"
                        style={{ color: colors.charcoal }}
                      >
                        Mark "{selectedItem.name}" as used?
                      </span>
                      <button
                        type="button"
                        className="btn px-3"
                        style={{
                          ...btnPrimaryStyle,
                          borderRadius: 6,
                          fontWeight: 600,
                          padding: "0.4rem 1rem",
                          fontSize: "0.85rem",
                          color: colors.white,
                        }}
                        onClick={handleMarkUsed}
                        disabled={markingUsed}
                      >
                        {markingUsed ? "Saving…" : "Yes, mark used"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        style={{ fontSize: "0.85rem", color: colors.muted }}
                        onClick={() => setConfirmingUsed(false)}
                        disabled={markingUsed}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="d-flex justify-content-end gap-3 flex-wrap">
                      <button
                        type="button"
                        className="btn px-4"
                        style={{
                          opacity: 0.85,
                          borderColor: colors.green,
                          color: colors.charcoal,
                          fontWeight: 600,
                          borderRadius: 6,
                          borderWidth: "2px",
                          padding: "0.45rem 1.15rem",
                          fontSize: "0.9rem",
                        }}
                        onClick={() => setConfirmingUsed(true)}
                      >
                        Mark as Used
                      </button>
                      <button
                        type="button"
                        className="btn px-4"
                        style={{
                          opacity: 0.85,
                          borderColor: colors.green,
                          color: colors.charcoal,
                          fontWeight: 600,
                          borderRadius: 6,
                          borderWidth: "2px",
                          padding: "0.45rem 1.15rem",
                          fontSize: "0.9rem",
                        }}
                        onClick={handlePlanForMeal}
                      >
                        Plan for Meal
                      </button>
                      <button
                        type="button"
                        className="btn px-4"
                        style={{
                          ...btnPrimaryStyle,
                          borderRadius: 6,
                          fontWeight: 600,
                          padding: "0.45rem 1.15rem",
                          fontSize: "0.9rem",
                          color: colors.white,
                        }}
                        onClick={() => setDonateTarget(selectedItem)}
                      >
                        Flag for Donation
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="d-flex justify-content-end gap-3 mt-4">
                  <button
                    type="button"
                    className="btn px-4 contact-btn"
                    style={{
                      opacity: 0.8,
                      borderColor: colors.green,
                      color: colors.charcoal,
                      fontWeight: 600,
                      borderRadius: 6,
                      borderWidth: "2px",
                      padding: "0.45rem 1.25rem",
                      fontSize: "0.9rem",
                    }}
                    onClick={() => setShowContact((v) => !v)}
                  >
                    Contact Donor
                  </button>
                  <button
                    type="button"
                    className="btn px-4 claim-food"
                    style={{
                      ...btnPrimaryStyle,
                      borderRadius: 6,
                      fontWeight: 600,
                      padding: "0.45rem 1.15rem",
                      fontSize: "0.9rem",
                      color: colors.white,
                    }}
                    onClick={handleClaim}
                    disabled={claiming || selectedItem.alreadyRequestedByMe}
                  >
                    {selectedItem.alreadyRequestedByMe
                      ? "Requested"
                      : "Claim Item"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {donateTarget && (
          <DonateModal
            item={donateTarget}
            onCancel={() => setDonateTarget(null)}
            onConfirm={handleDonateConfirm}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <style>
        {`
          @keyframes slideInUp {
            from { opacity: 0; transform: translateY(18px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .food-card {
            transition: transform 0.25s ease, box-shadow 0.25s ease;
          }

          .food-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 22px rgba(0, 0, 0, 0.07) !important;
          }

          .view-btn {
            transition: all 0.2s ease;
          }

          .view-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
          }

          .search-input {
            outline: none;
            border-color: ${colors.green};
            transition: all 0.2s ease;
          }

          .search-input:focus {
            border-color: ${colors.greenLrgb};
            box-shadow: 0 0 0 0.2rem ${colors.greenLrgb};
          }

          .segmented-btn {
            height: 44px;
            font-weight: 600;
            font-size: 0.88rem;
            border: 2px solid ${colors.green};
            background: ${colors.white};
            color: ${colors.charcoal};
            transition: all 0.2s ease;
          }

          .segmented-btn.active {
            background: ${colors.greenLrgb};
            color: ${colors.charcoal};
            font-weight: 700;
          }

          .custom-select {
            height: 44px;
            border: 2px solid ${colors.green};
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.88rem;
            color: ${colors.charcoal};
            background-color: ${colors.white};
            cursor: pointer;
            box-shadow: none !important;
            padding-right: 2.2rem;
            appearance: none;
          }

          .custom-select:focus {
            border-color: ${colors.greenLrgb};
            box-shadow: 0 0 0 0.2rem ${colors.greenLrgb} !important;
          }

          .reset-btn {
            height: 44px;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            color: #d9534f;
            border: 1px solid #d9534f;
            background: transparent;
            transition: all 0.2s ease;
          }

          .reset-btn:hover {
            background: #d9534f;
            color: #fff;
          }
        `}
      </style>

      <div className="mb-4">
        <h1
          style={{
            fontFamily: fonts.body,
            fontSize: "1.60rem",
            fontWeight: 700,
            color: colors.charcoal,
            marginBottom: "0.25rem",
            opacity: 0.85,
          }}
        >
          Browse Food Items
        </h1>
        <p className="mb-0" style={{ color: colors.muted }}>
          Stay organized with a complete view of available items and donations.
        </p>
      </div>

      {/* Control Bar - Primary & Secondary Tiers */}
      <div
        className="bg-white p-3 rounded-4 border mb-4 shadow-sm"
        style={{ borderColor: colors.greenLrgb }}
      >
        {/* Tier 1: Search & Type Toggle */}
        <div className="row g-3 align-items-center mb-3">
          <div className="col-12 col-md-6 col-lg-7">
            <div className="position-relative">
              <Search
                size={20}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: colors.muted,
                }}
              />
              <input
                type="text"
                className="form-control search-input"
                style={{
                  paddingLeft: "2.5rem",
                  borderRadius: 8,
                  borderWidth: "2px",
                  height: 44,
                }}
                placeholder="Search food items by name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-5">
            <div
              className="btn-group w-100"
              role="group"
              aria-label="Item Type Filter"
            >
              <button
                type="button"
                className={`btn segmented-btn ${typeFilter === "all" ? "active" : ""}`}
                style={{ borderRadius: "8px 0 0 8px" }}
                onClick={() => {
                  setTypeFilter("all");
                  setPage(1);
                }}
              >
                All
              </button>
              <button
                type="button"
                className={`btn segmented-btn ${typeFilter === "inventory" ? "active" : ""}`}
                onClick={() => {
                  setTypeFilter("inventory");
                  setPage(1);
                }}
              >
                Inventory
              </button>
              <button
                type="button"
                className={`btn segmented-btn ${typeFilter === "donations" ? "active" : ""}`}
                style={{ borderRadius: "0 8px 8px 0" }}
                onClick={() => {
                  setTypeFilter("donations");
                  setPage(1);
                }}
              >
                Donations
              </button>
            </div>
          </div>
        </div>

        {/* Tier 2: Categorical Filter Dropdowns */}
        <div
          className="row g-3 align-items-center pt-2 border-top"
          style={{ borderColor: "#f0f0f0" }}
        >
          <div className="col-12 col-sm-6 col-md-3">
            <div className="position-relative">
              <select
                className="form-select custom-select"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: colors.muted,
                }}
              />
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-3">
            <div className="position-relative">
              <select
                className="form-select custom-select"
                value={expiryFilter}
                onChange={(e) => {
                  setExpiryFilter(e.target.value);
                  setPage(1);
                }}
              >
                {EXPIRY_OPTIONS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: colors.muted,
                }}
              />
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-3">
            <div className="position-relative">
              <select
                className="form-select custom-select"
                value={storageType}
                onChange={(e) => {
                  setStorageType(e.target.value);
                  setPage(1);
                }}
              >
                {STORAGE_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: colors.muted,
                }}
              />
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-3 d-flex align-items-center justify-content-end gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                className="btn reset-btn w-100 d-inline-flex align-items-center justify-content-center gap-1"
                onClick={resetAllFilters}
              >
                <RotateCcw size={14} />
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {errMsg && (
        <div className="alert alert-danger py-2 small mb-3">{errMsg}</div>
      )}

      {/* Main Grid View */}
      <div
        className="rounded-4 p-4"
        style={{
          background: colors.authGreen,
          border: `2px solid ${colors.greenLrgb}`,
          minHeight: "500px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading ? (
          <div
            className="text-center py-5 my-auto"
            style={{ color: colors.muted }}
          >
            Loading food items…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-5 my-auto">
            <Filter
              size={36}
              className="mb-2"
              style={{ color: colors.muted, opacity: 0.5 }}
            />
            <h6 className="fw-bold text-secondary">
              No matching food items found
            </h6>
            <p className="small mb-3" style={{ color: colors.muted }}>
              Try adjusting your search query or clearing active filters.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                onClick={resetAllFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="row g-4">
            {paginated.map((item, idx) => {
              const itemStorage = getStorageTypeValue(item);
              return (
                <div
                  className="col-12 col-md-6 col-lg-4 d-flex align-items-stretch"
                  key={item.id}
                >
                  <div
                    className="p-3 rounded-4 w-100 h-100 d-flex gap-3 food-card position-relative"
                    style={{
                      background: colors.low_greenFade,
                      border: `2px solid ${colors.greenLrgb}`,
                      minHeight: "160px",
                      animation: `slideInUp 0.4s ease-out ${idx * 0.04}s backwards`,
                    }}
                  >
                    <img
                      src={getFoodImage(item)}
                      alt={item.name}
                      className="rounded-3 flex-shrink-0"
                      style={{
                        width: 88,
                        height: 88,
                        objectFit: "cover",
                        backgroundColor: colors.white,
                      }}
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />

                    <div
                      className="d-flex flex-column flex-grow-1 h-100"
                      style={{ minWidth: 0 }}
                    >
                      {/* Item Header & Category Pill */}
                      <div className="d-flex align-items-start justify-content-between gap-1 mb-1">
                        <div
                          className="fw-bold text-truncate"
                          style={{
                            color: colors.charcoal,
                            fontSize: "0.95rem",
                          }}
                          title={item.name}
                        >
                          {getDisplayName(item)}
                        </div>
                        <span
                          className="badge rounded-pill fw-semibold flex-shrink-0"
                          style={{
                            backgroundColor: colors.greenLrgb,
                            color: colors.charcoal,
                            fontSize: "0.68rem",
                            padding: "0.25rem 0.5rem",
                          }}
                        >
                          {item.category}
                        </span>
                      </div>

                      {/* Quantity & Storage Tag */}
                      <div
                        className="small fw-semibold d-flex align-items-center justify-content-between"
                        style={{ color: colors.charcoal }}
                      >
                        <span>
                          {item.quantity} {item.quantityUnit}
                        </span>
                        {itemStorage && (
                          <span
                            className="badge bg-light text-secondary border fw-normal"
                            style={{ fontSize: "0.70rem" }}
                          >
                            {itemStorage}
                          </span>
                        )}
                      </div>

                      {/* Expiry Details */}
                      <div
                        className="small mb-2 text-truncate"
                        style={{ color: colors.muted, fontSize: "0.78rem" }}
                      >
                        Expires {formatDate(item.expiryDate)}
                      </div>

                      {/* View Details Button */}
                      <div className="d-flex justify-content-end mt-auto">
                        <button
                          type="button"
                          className="btn btn-sm view-btn"
                          style={{
                            ...btnPrimaryStyle,
                            borderRadius: 6,
                            fontWeight: 600,
                            padding: "0.38rem 0.85rem",
                            fontSize: "0.82rem",
                            color: colors.white,
                          }}
                          onClick={() => openDetails(item)}
                        >
                          View Details
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="d-flex align-items-center justify-content-end gap-3 mt-4">
          <button
            type="button"
            className="btn btn-sm p-1"
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
            className="btn btn-sm p-1"
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
    </div>
  );
}
