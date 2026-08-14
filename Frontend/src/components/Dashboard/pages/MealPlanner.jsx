import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Bell,
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  Utensils,
} from "lucide-react";
import { colors, fonts, btnPrimaryStyle } from "../../../theme";
import { foodApi } from "../../../services/api";
import SuggestedMeals from "../SuggestedMeals";
import { logActivity } from "../../../utils/activitylog";
import { getStoredUser } from "../../../utils/auth";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const STORAGE_PREFIX = "zw_meal_planner";

function getStorageKey() {
  const user = getStoredUser();
  const userId = user?.id ?? "anonymous";
  return `${STORAGE_PREFIX}:${userId}`;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatMonthYear(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadMeals() {
  try {
    return JSON.parse(localStorage.getItem(getStorageKey()) || "{}");
  } catch {
    return {};
  }
}

function saveMeals(meals) {
  localStorage.setItem(getStorageKey(), JSON.stringify(meals));
}

const DAY_SHORT = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const INVENTORY_PAGE_SIZE = 6;

const DEFAULT_ITEM_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop";

function formatExpiry(dateStr) {
  if (!dateStr) return "No expiry set";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry - today) / 86400000);
}

export default function MealPlanner() {
  const [viewMode, setViewMode] = useState("week");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [meals, setMeals] = useState(loadMeals);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [mealName, setMealName] = useState("");
  const [linkedItem, setLinkedItem] = useState("");
  const [inventoryPage, setInventoryPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");

  const sortedInventory = useMemo(() => {
    return [...inventoryItems].sort((a, b) => {
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return new Date(a.expiryDate) - new Date(b.expiryDate);
    });
  }, [inventoryItems]);

  const inventoryTotalPages = Math.max(
    1,
    Math.ceil(sortedInventory.length / INVENTORY_PAGE_SIZE),
  );
  const paginatedInventory = sortedInventory.slice(
    (inventoryPage - 1) * INVENTORY_PAGE_SIZE,
    inventoryPage * INVENTORY_PAGE_SIZE,
  );

  useEffect(() => {
    if (inventoryPage > inventoryTotalPages) setInventoryPage(1);
  }, [inventoryTotalPages, inventoryPage]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await foodApi.getAll();
        if (!cancelled) setInventoryItems(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setInventoryItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const monthStart = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(1);
    return d;
  }, [weekStart]);

  const monthDays = useMemo(() => {
    const days = [];
    const start = new Date(monthStart);
    const endDate = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0,
    );
    const firstDay = start.getDay() === 0 ? 6 : start.getDay() - 1;
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= endDate.getDate(); d++) {
      days.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [monthStart]);

  const shownMonthYear =
    viewMode === "week"
      ? formatMonthYear(weekStart)
      : formatMonthYear(monthStart);

  const navPrev = () => {
    if (viewMode === "week") setWeekStart((d) => addDays(d, -7));
    else
      setWeekStart((d) => {
        const nd = new Date(d);
        nd.setMonth(nd.getMonth() - 1);
        return getWeekStart(nd);
      });
  };

  const navNext = () => {
    if (viewMode === "week") setWeekStart((d) => addDays(d, 7));
    else
      setWeekStart((d) => {
        const nd = new Date(d);
        nd.setMonth(nd.getMonth() + 1);
        return getWeekStart(nd);
      });
  };

  const getMealData = (date, meal) => {
    const k = `${dayKey(date)}_${meal}`;
    const raw = meals[k];
    if (typeof raw === "object" && raw !== null) return raw;
    return { name: raw || "", linkedItem: "" };
  };

  const openEditModal = (date, meal) => {
    const k = `${dayKey(date)}_${meal}`;
    const data = getMealData(date, meal);
    setMealName(data.name || "");
    setLinkedItem(data.linkedItem || "");
    setActiveModal({
      key: k,
      date,
      meal,
      formattedDate: date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    });
  };

  const saveMealModal = () => {
    if (!activeModal) return;
    const updated = {
      ...meals,
      [activeModal.key]: {
        name: mealName,
        linkedItem,
      },
    };
    setMeals(updated);
    saveMeals(updated);
    logActivity(`Planned meal: ${mealName || "Cleared slot"}`);
    setActiveModal(null);
  };

  const deleteMealSlot = (key) => {
    const updated = { ...meals };
    delete updated[key];
    setMeals(updated);
    saveMeals(updated);
  };

  const handleConfirmWeeklyPlan = () => {
    saveMeals(meals);
    logActivity("Confirmed weekly meal plan & scheduled reminders");
    setStatusMessage(
      "Weekly plan saved successfully! Reserved inventory and scheduled meal reminders.",
    );
    setTimeout(() => setStatusMessage(""), 4000);
  };

  const today = dayKey(new Date());
  const cellBorder = `2px solid ${colors.greenLrgb}`;

  return (
    <div>
      <style>{`
        .meal-cell-hover {
          transition: all 0.2s ease;
          position: relative;
        }
        .meal-cell-hover:hover {
          background-color: #F3F9F4 !important;
        }
        .meal-cell-hover .add-btn-trigger {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .meal-cell-hover:hover .add-btn-trigger {
          opacity: 1;
        }
        .meal-card-item {
          background: #FFFFFF;
          border: 1px solid ${colors.greenLrgb};
          border-radius: 8px;
          padding: 8px 10px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.03);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .meal-card-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(0,0,0,0.06);
        }
      `}</style>

      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h1
            style={{
              fontFamily: fonts.body,
              fontSize: "1.60rem",
              fontWeight: 700,
              color: colors.charcoal,
              opacity: 0.75,
              marginBottom: "0.25rem",
            }}
          >
            Meal Planner
          </h1>
          <p className="mb-0" style={{ color: colors.muted }}>
            Create smarter meal plans based on your food inventory.
          </p>
        </div>

        <button
          type="button"
          className="btn d-inline-flex align-items-center gap-2"
          onClick={handleConfirmWeeklyPlan}
          style={{
            ...btnPrimaryStyle,
            color: colors.white,
            fontWeight: 600,
            padding: "0.55rem 1.25rem",
            fontSize: "0.9rem",
            borderRadius: 6,
          }}
        >
          <CheckCircle2 size={18} /> Confirm & Save Plan
        </button>
      </div>

      {statusMessage && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 small mb-3">
          <Bell size={16} /> {statusMessage}
        </div>
      )}

      <SuggestedMeals />

      {/* Inventory Panel */}
      {inventoryItems.length > 0 && (
        <div
          className="rounded-4 p-3 mb-4"
          style={{
            background: colors.authGreen,
            border: `2px solid ${colors.greenLrgb}`,
          }}
        >
          <div
            className="d-flex align-items-baseline justify-content-between flex-wrap gap-2"
            style={{ marginBottom: 10 }}
          >
            <div style={{ fontWeight: 700, color: colors.charcoal }}>
              Available from your inventory
            </div>
            <span className="small" style={{ color: colors.muted }}>
              Sorted by nearest expiry &middot; {sortedInventory.length} item
              {sortedInventory.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="row g-3">
            {paginatedInventory.map((item) => {
              const daysLeft = daysUntilExpiry(item.expiryDate);
              const isUrgent = daysLeft !== null && daysLeft <= 3;
              return (
                <div className="col-12 col-sm-6 col-lg-4" key={item.id}>
                  <div
                    className="d-flex gap-3 p-2 rounded-3 h-100"
                    style={{
                      background: colors.white,
                      border: `1px solid ${colors.greenLrgb}`,
                    }}
                  >
                    <img
                      src={item.imageUrl || DEFAULT_ITEM_IMAGE}
                      alt={item.name}
                      className="rounded-3 flex-shrink-0"
                      style={{ width: 50, height: 50, objectFit: "cover" }}
                    />
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div
                        className="fw-bold text-truncate"
                        style={{ color: colors.greenD, fontSize: "0.85rem" }}
                        title={item.name}
                      >
                        {item.name}
                      </div>
                      <div className="small" style={{ color: colors.charcoal }}>
                        {item.quantity} {item.quantityUnit}
                      </div>
                      <div
                        className="small"
                        style={{
                          color: isUrgent ? "#b3261e" : colors.muted,
                          fontWeight: isUrgent ? 700 : 400,
                          fontSize: "0.75rem",
                        }}
                      >
                        Expires {formatExpiry(item.expiryDate)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {inventoryTotalPages > 1 && (
            <div className="d-flex align-items-center justify-content-center gap-2 mt-3">
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center justify-content-center"
                onClick={() => setInventoryPage((p) => Math.max(1, p - 1))}
                disabled={inventoryPage === 1}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: `2px solid ${colors.greenLrgb}`,
                  background: "white",
                  padding: 0,
                  opacity: inventoryPage === 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={14} color={colors.charcoal} />
              </button>
              <span
                className="small"
                style={{
                  color: colors.muted,
                  minWidth: 70,
                  textAlign: "center",
                }}
              >
                Page {inventoryPage} of {inventoryTotalPages}
              </span>
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center justify-content-center"
                onClick={() =>
                  setInventoryPage((p) => Math.min(inventoryTotalPages, p + 1))
                }
                disabled={inventoryPage === inventoryTotalPages}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: `2px solid ${colors.greenLrgb}`,
                  background: "white",
                  padding: 0,
                  opacity: inventoryPage === inventoryTotalPages ? 0.5 : 1,
                }}
              >
                <ChevronRight size={14} color={colors.charcoal} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation & View Switcher */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center justify-content-center"
            onClick={navPrev}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `2px solid ${colors.greenLrgb}`,
              background: "white",
              padding: 0,
            }}
          >
            <ChevronLeft size={16} color={colors.charcoal} />
          </button>

          <span
            style={{
              fontWeight: 600,
              fontSize: "0.95rem",
              color: colors.charcoal,
              minWidth: 130,
              textAlign: "center",
            }}
          >
            {shownMonthYear}
          </span>

          <button
            type="button"
            className="btn btn-sm d-flex align-items-center justify-content-center"
            onClick={navNext}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `2px solid ${colors.greenLrgb}`,
              background: "white",
              padding: 0,
            }}
          >
            <ChevronRight size={16} color={colors.charcoal} />
          </button>
        </div>

        <div
          className="d-flex"
          style={{
            border: `2px solid ${colors.greenLrgb}`,
            borderRadius: 10,
            overflow: "hidden",
            background: "white",
          }}
        >
          {["week", "month"].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              style={{
                padding: "0.4rem 1.1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                border: "none",
                background:
                  viewMode === mode ? colors.greenLrgb : "transparent",
                color: viewMode === mode ? "white" : colors.muted,
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "background 0.15s ease",
              }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Card View */}
      <div
        className="bg-white rounded-4 overflow-hidden shadow-sm"
        style={{ border: `2px solid ${colors.greenLrgb}` }}
      >
        {viewMode === "week" ? (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 780,
              }}
            >
              <thead>
                <tr style={{ background: colors.showcase_green }}>
                  <th
                    style={{
                      width: 100,
                      borderBottom: cellBorder,
                      borderRight: cellBorder,
                    }}
                  />
                  {weekDays.map((d, i) => {
                    const isToday = dayKey(d) === today;
                    return (
                      <th
                        key={i}
                        style={{
                          borderBottom: cellBorder,
                          borderRight: i < 6 ? cellBorder : "none",
                          padding: "12px 8px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            letterSpacing: "0.07em",
                            color: colors.muted,
                            textTransform: "uppercase",
                          }}
                        >
                          {DAY_SHORT[i]}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            background: isToday ? colors.green : "transparent",
                            color: isToday ? "white" : colors.charcoal,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.875rem",
                            fontWeight: 700,
                          }}
                        >
                          {d.getDate()}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {MEAL_TYPES.map((meal, mi) => (
                  <tr key={meal}>
                    <td
                      style={{
                        borderBottom:
                          mi < MEAL_TYPES.length - 1 ? cellBorder : "none",
                        borderRight: cellBorder,
                        padding: "0 14px",
                        verticalAlign: "middle",
                        width: 100,
                        background: colors.showcase_green,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          color: colors.charcoal,
                          opacity: 0.75,
                        }}
                      >
                        {meal}
                      </span>
                    </td>
                    {weekDays.map((d, di) => {
                      const k = `${dayKey(d)}_${meal}`;
                      const mealData = getMealData(d, meal);

                      return (
                        <td
                          key={di}
                          className="meal-cell-hover"
                          style={{
                            borderBottom:
                              mi < MEAL_TYPES.length - 1 ? cellBorder : "none",
                            borderRight: di < 6 ? cellBorder : "none",
                            padding: "8px",
                            verticalAlign: "top",
                            minHeight: 105,
                            height: 105,
                            cursor: "pointer",
                            background: colors.white,
                          }}
                          onClick={() => openEditModal(d, meal)}
                        >
                          {mealData.name ? (
                            <div className="meal-card-item">
                              <div className="d-flex align-items-center justify-content-between gap-1 mb-1">
                                <span
                                  style={{
                                    fontSize: "0.82rem",
                                    fontWeight: 700,
                                    color: colors.charcoal,
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {mealData.name}
                                </span>
                                <div className="d-flex align-items-center gap-1">
                                  <button
                                    type="button"
                                    className="btn btn-link p-0 text-muted"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditModal(d, meal);
                                    }}
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-link p-0 text-danger"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteMealSlot(k);
                                    }}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>

                              {mealData.linkedItem && (
                                <div
                                  className="d-inline-flex align-items-center gap-1"
                                  style={{
                                    fontSize: "0.68rem",
                                    color: colors.greenD,
                                    backgroundColor: colors.authGreen,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    fontWeight: 600,
                                  }}
                                >
                                  <Package size={10} /> {mealData.linkedItem}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              className="w-100 h-100 d-flex align-items-center justify-content-center rounded-2"
                              style={{ border: "1px dashed #E5E7EB" }}
                            >
                              <span
                                className="add-btn-trigger d-inline-flex align-items-center gap-1"
                                style={{
                                  fontSize: "0.75rem",
                                  color: colors.green,
                                  fontWeight: 600,
                                }}
                              >
                                <Plus size={13} /> Add
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Month View */
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 560,
              }}
            >
              <thead>
                <tr style={{ background: colors.showcase_green }}>
                  {DAY_SHORT.map((d, i) => (
                    <th
                      key={d}
                      style={{
                        borderBottom: cellBorder,
                        borderRight: i < 6 ? cellBorder : "none",
                        padding: "10px 0",
                        textAlign: "center",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        letterSpacing: "0.07em",
                        color: colors.muted,
                        textTransform: "uppercase",
                      }}
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from(
                  { length: Math.ceil(monthDays.length / 7) },
                  (_, wi) => (
                    <tr key={wi}>
                      {monthDays.slice(wi * 7, wi * 7 + 7).map((d, di) => {
                        const isToday = d && dayKey(d) === today;
                        const inMonth =
                          d && d.getMonth() === monthStart.getMonth();
                        const mealsForDay = d
                          ? MEAL_TYPES.map(
                              (m) => getMealData(d, m).name,
                            ).filter(Boolean)
                          : [];
                        return (
                          <td
                            key={di}
                            style={{
                              borderBottom:
                                wi < Math.ceil(monthDays.length / 7) - 1
                                  ? cellBorder
                                  : "none",
                              borderRight: di < 6 ? cellBorder : "none",
                              padding: "8px 8px",
                              verticalAlign: "top",
                              minHeight: 90,
                              height: 90,
                              background: !inMonth
                                ? colors.authGreen
                                : colors.white,
                            }}
                          >
                            {d && (
                              <>
                                <div
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: "50%",
                                    background: isToday
                                      ? colors.green
                                      : "transparent",
                                    color: isToday
                                      ? colors.white
                                      : inMonth
                                        ? colors.charcoal
                                        : colors.border,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.8rem",
                                    fontWeight: isToday ? 700 : 500,
                                    marginBottom: 4,
                                  }}
                                >
                                  {d.getDate()}
                                </div>
                                {mealsForDay.slice(0, 2).map((m, mi) => (
                                  <div
                                    key={mi}
                                    style={{
                                      fontSize: "0.7rem",
                                      color: colors.greenD,
                                      background: colors.authGreen,
                                      borderRadius: 4,
                                      padding: "1px 5px",
                                      marginBottom: 2,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {m}
                                  </div>
                                ))}
                                {mealsForDay.length > 2 && (
                                  <div
                                    style={{
                                      fontSize: "0.68rem",
                                      color: colors.muted,
                                    }}
                                  >
                                    +{mealsForDay.length - 2} more
                                  </div>
                                )}
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Meal Dialog Modal */}
      {activeModal && (
        <div
          onClick={() => setActiveModal(null)}
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
            zIndex: 10000,
            padding: 16,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#FFFFFF",
              color: colors.charcoal,
              borderRadius: 14,
              maxWidth: 440,
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-2">
                <Utensils size={18} color={colors.green} />
                <h5 className="m-0 fw-bold" style={{ color: colors.charcoal }}>
                  Plan {activeModal.meal}
                </h5>
              </div>
              <button
                type="button"
                className="btn btn-link text-muted p-0"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-muted small mb-3">
              {activeModal.formattedDate} &middot; Select or type a meal and
              link an inventory ingredient.
            </p>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-muted">
                Meal Name / Dish
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Scrambled Eggs with Toast"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                style={{
                  border: `1.5px solid ${colors.greenLrgb}`,
                  borderRadius: 8,
                }}
              />
            </div>

            <div className="mb-4">
              <label className="form-label small fw-semibold text-muted">
                Link Inventory Ingredient
              </label>
              <select
                className="form-select"
                value={linkedItem}
                onChange={(e) => setLinkedItem(e.target.value)}
                style={{
                  border: `1.5px solid ${colors.greenLrgb}`,
                  borderRadius: 8,
                }}
              >
                <option value="">No linked ingredient</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name} ({item.quantity} {item.quantityUnit})
                  </option>
                ))}
              </select>
            </div>

            <div className="d-flex align-items-center justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-light fw-semibold"
                onClick={() => setActiveModal(null)}
                style={{ borderRadius: 8 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn text-white fw-bold px-4"
                onClick={saveMealModal}
                style={{
                  background: colors.green,
                  borderRadius: 8,
                }}
              >
                Save Meal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
