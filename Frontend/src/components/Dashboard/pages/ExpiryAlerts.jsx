import { useEffect, useState, useMemo } from "react";
import { Bell, RefreshCw, ChevronsLeft, ChevronsRight } from "lucide-react";
import { colors, fonts, btnPrimaryStyle } from "../../../theme";
import { foodApi } from "../../../services/api";
import DonateModal from "../DonateModal";
import { logActivity } from "../../../utils/activitylog";

const PAGE_SIZE = 8;

function getDaysLeft(dateStr) {
  if (!dateStr) return null;

  const diff =
    new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);

  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return "—";

  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const FILTERS = ["All", "Expiring Soon", "Expired"];

// Items expiring within 7 days (but not yet expired)
// count as "Expiring Soon"
function getStatus(daysLeft) {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return "Expired";
  if (daysLeft <= 7) return "Expiring Soon";

  return "More Than 7 Days Left";
}

export default function ExpiryAlerts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [donatingId, setDonatingId] = useState(null);
  const [page, setPage] = useState(1);
  const [donateTarget, setDonateTarget] = useState(null);

  const loadItems = () => {
    setLoading(true);
    setError("");

    foodApi
      .getAll()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || "Failed to load food items."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleDonateConfirm = async (details) => {
    setDonatingId(donateTarget.id);

    try {
      await foodApi.donate(donateTarget.id, details);

      logActivity(`Donated ${donateTarget.name}`);

      setDonateTarget(null);

      // Move the item into the "donated" pool on the backend;
      // refresh this list.
      loadItems();
    } finally {
      setDonatingId(null);
    }
  };

  // Calculate days left for every food item
  const alertItems = useMemo(() => {
    return items
      .map((item) => ({
        ...item,
        daysLeft: getDaysLeft(item.expiryDate),
      }))
      .filter((item) => item.daysLeft !== null)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [items]);

  // Apply selected filter
  const filteredItems = useMemo(() => {
    if (activeFilter === "All") return alertItems;

    return alertItems.filter(
      (item) => getStatus(item.daysLeft) === activeFilter,
    );
  }, [alertItems, activeFilter]);

  // Reset pagination when filter changes
  useEffect(() => {
    setPage(1);
  }, [activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-start justify-content-between mb-2 gap-3 flex-wrap">
        <div>
          <style>
            {`
              .donate-btn {
                opacity: 0.75;
                transition:
                  opacity 0.2s ease,
                  background 0.25s ease,
                  transform 0.25s ease,
                  box-shadow 0.25s ease;
              }

              .donate-btn:hover:not(:disabled) {
                opacity: 1;
                transform: translateY(-1px);
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
              }
            `}
          </style>

          <h1
            style={{
              fontFamily: fonts.body,
              fontSize: "1.60rem",
              opacity: 0.75,
              fontWeight: 700,
              color: colors.charcoal,
              marginBottom: "0.25rem",
            }}
          >
            Expiry Alerts
          </h1>

          <p
            className="mb-0"
            style={{
              color: colors.muted,
            }}
          >
            Never let good food go to waste with timely expiry reminders.
          </p>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          className="btn btn-sm d-inline-flex align-items-center gap-2"
          onClick={loadItems}
          style={{
            border: `2px solid ${colors.greenLrgb}`,
            borderRadius: 8,
            color: colors.muted,
            background: colors.white,
            padding: "0.4rem 0.9rem",
            fontSize: "0.825rem",
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="d-flex gap-2 mb-4 mt-4">
        {FILTERS.map((f) => {
          const isActive = activeFilter === f;

          return (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className="fw-semibold"
              style={{
                padding: "0.5rem 1.4rem",
                fontSize: "0.9rem",
                border: "none",
                borderRadius: 6,
                background: isActive ? colors.greenL : colors.low_greenFade,
                color: isActive ? "white" : colors.charcoal,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger py-2 small mb-4">{error}</div>
      )}

      {/* Table Card */}
      <div
        className="rounded-4 overflow-hidden"
        style={{
          border: `2px solid ${colors.greenLrgb}`,
          background: colors.authGreen,
        }}
      >
        {loading ? (
          <div
            className="text-center py-5"
            style={{
              color: colors.muted,
            }}
          >
            Loading alerts…
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-5">
            <Bell
              size={36}
              color={colors.border}
              className="mb-3 d-block mx-auto"
            />

            <p
              className="mb-1 fw-semibold"
              style={{
                color: colors.charcoal,
              }}
            >
              {activeFilter === "All"
                ? "All your food is fresh!"
                : `No items with status "${activeFilter}"`}
            </p>

            <p
              className="mb-0 small"
              style={{
                color: colors.muted,
              }}
            >
              {activeFilter === "All" &&
                "Items expiring within 7 days will appear here."}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table
              className="table align-middle mb-0"
              style={{
                width: "100%",
                tableLayout: "fixed",
                margin: 0,
              }}
            >
              {/* Fixed Column Widths */}
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>

              {/* Table Header */}
              <thead>
                <tr
                  style={{
                    background: colors.authGreen,
                    fontSize: "0.9rem",
                    color: colors.charcoal,
                  }}
                >
                  <th
                    className="ps-4 py-3 border-0 fw-bold"
                    style={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    Food Items
                  </th>

                  <th
                    className="py-3 border-0 fw-bold"
                    style={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    Category
                  </th>

                  <th
                    className="py-3 border-0 fw-bold"
                    style={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    Days Left
                  </th>

                  <th
                    className="py-3 border-0 fw-bold"
                    style={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    Expiry Date
                  </th>

                  <th
                    className="py-3 border-0 fw-bold"
                    style={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    Status
                  </th>

                  <th
                    className="pe-4 py-3 border-0 fw-bold text-end"
                    style={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {paginatedItems.map((item, idx) => {
                  const status = getStatus(item.daysLeft);
                  const isExpired = status === "Expired";

                  const daysLabel = isExpired
                    ? "-"
                    : item.daysLeft === 0
                      ? "Today"
                      : `${item.daysLeft} day${item.daysLeft !== 1 ? "s" : ""}`;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderTop:
                          idx === 0 ? "none" : `2px solid ${colors.greenLrgb}`,
                      }}
                    >
                      {/* Food Item */}
                      <td
                        className="ps-4 py-3"
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          className="fw-semibold"
                          style={{
                            color: colors.charcoal,
                          }}
                        >
                          {item.name}
                        </span>
                      </td>

                      {/* Category */}
                      <td
                        className="py-3"
                        style={{
                          color: colors.charcoal,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.category}
                      </td>

                      {/* Days Left */}
                      <td
                        className="py-3"
                        style={{
                          color: colors.charcoal,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {daysLabel}
                      </td>

                      {/* Expiry Date */}
                      <td
                        className="py-3"
                        style={{
                          color: colors.charcoal,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(item.expiryDate)}
                      </td>

                      {/* Status */}
                      <td
                        className="py-3"
                        style={{
                          color: colors.charcoal,
                          overflow: "hidden",
                        }}
                      >
                        <span
                          className="px-3 py-2 rounded-3"
                          style={{
                            background: isExpired ? "#BA5A5A" : "#50C878",
                            color: colors.white,
                            fontSize: "0.85rem",
                            fontWeight: 500,
                            display: "inline-block",
                            whiteSpace: "nowrap",
                            maxWidth: "100%",
                          }}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Action */}
                      <td
                        className="pe-4 py-3 text-end"
                        style={{
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isExpired ? (
                          <span
                            style={{
                              color: colors.muted,
                              fontSize: "0.85rem",
                              fontWeight: 500,
                              fontStyle: "italic",
                              paddingRight: "0.5rem",
                            }}
                          >
                            Cannot Donate
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm donate-btn"
                            disabled={donatingId === item.id}
                            onClick={() => setDonateTarget(item)}
                            style={{
                              ...btnPrimaryStyle,
                              borderRadius: 4,
                              fontWeight: 600,
                              padding: "0.45rem 1.15rem",
                              fontSize: "0.9rem",
                              color: colors.white,
                              transition: "all 0.5s ease",
                            }}
                          >
                            Donate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredItems.length > 0 && totalPages > 1 && (
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

          <span
            className="fw-semibold"
            style={{
              color: colors.charcoal,
            }}
          >
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

      {/* Donate Modal */}
      <DonateModal
        item={donateTarget}
        onCancel={() => setDonateTarget(null)}
        onConfirm={handleDonateConfirm}
      />
    </div>
  );
}
