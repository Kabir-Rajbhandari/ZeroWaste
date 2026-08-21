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
  Coffee,
  Soup,
  Moon,
  Cookie,
  ClipboardCheck,
} from "lucide-react";
import { colors, fonts, shadows, btnPrimaryStyle } from "../../../theme";
import { foodApi, mealPlanApi } from "../../../services/api";
import SuggestedMeals from "../SuggestedMeals";
import { logActivity } from "../../../utils/activitylog";
import { getWeekStart, addDays, dayKey } from "../../../utils/weekDates";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"];

// Small per-meal-type accent so the grid reads at a glance without reaching
// for extra colors — everything still sits inside the existing green/brand
// palette, just varied slightly in tone/opacity per slot.
const MEAL_TYPE_CONFIG = {
  Breakfast: { icon: Coffee, tint: "rgba(62, 160, 102, 0.10)" },
  Lunch: { icon: Soup, tint: "rgba(62, 160, 102, 0.16)" },
  Dinner: { icon: Moon, tint: "rgba(62, 160, 102, 0.22)" },
  Snacks: { icon: Cookie, tint: "rgba(62, 160, 102, 0.28)" },
};

function formatMonthYear(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
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

export default function MealPlanner({
  initialItem,
  onInitialItemConsumed,
} = {}) {
  const [viewMode, setViewMode] = useState("week");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [meals, setMeals] = useState({});
  const [inventoryItems, setInventoryItems] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [mealName, setMealName] = useState("");
  const [linkedItemId, setLinkedItemId] = useState("");
  const [inventoryPage, setInventoryPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState("success");
  const [confirmingPlan, setConfirmingPlan] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [mealsLoading, setMealsLoading] = useState(true);

  // Track whether the user has dismissed the pending item banner
  const [dismissedInitialItemId, setDismissedInitialItemId] = useState(null);

  // Derived value instead of syncing props into state via an effect
  const pendingPlanItem =
    initialItem && initialItem.id !== dismissedInitialItemId
      ? initialItem
      : null;

  const [pendingMealName, setPendingMealName] = useState(null);

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

  const currentInventoryPage = Math.min(inventoryPage, inventoryTotalPages);
  const paginatedInventory = sortedInventory.slice(
    (currentInventoryPage - 1) * INVENTORY_PAGE_SIZE,
    currentInventoryPage * INVENTORY_PAGE_SIZE,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInventoryLoading(true);
      try {
        const data = await foodApi.getAll();
        // Only items that are still good to eat belong here — an expired
        // item can't be planned into a meal. "Expires today" (0 days left)
        // still counts as available, matching the donation-eligibility rule
        // elsewhere in the app.
        const available = (Array.isArray(data) ? data : []).filter((item) => {
          const daysLeft = daysUntilExpiry(item.expiryDate);
          return daysLeft === null || daysLeft >= 0;
        });
        if (!cancelled) setInventoryItems(available);
      } catch {
        if (!cancelled) setInventoryItems([]);
      } finally {
        if (!cancelled) setInventoryLoading(false);
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

  // How many of this week's 28 slots (7 days x 4 meal types) already have a
  // planned meal — a quick, at-a-glance sense of progress toward "confirm
  // the week's plan".
  const weekPlannedCount = useMemo(() => {
    return weekDays.reduce((total, day) => {
      return (
        total +
        MEAL_TYPES.reduce((count, meal) => {
          const k = `${dayKey(day)}_${meal}`;
          return meals[k]?.name ? count + 1 : count;
        }, 0)
      );
    }, 0);
  }, [weekDays, meals]);

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

  const visibleRange = useMemo(() => {
    const candidates = [...weekDays, ...monthDays.filter(Boolean)];
    const start = candidates.reduce((min, d) => (d < min ? d : min));
    const end = candidates.reduce((max, d) => (d > max ? d : max));
    return { start, end };
  }, [weekDays, monthDays]);

  const rangeStartKey = dayKey(visibleRange.start);
  const rangeEndKey = dayKey(visibleRange.end);

  const loadMealsForRange = async (startKey, endKey) => {
    const data = await mealPlanApi.getRange(startKey, endKey);
    const dict = {};
    (Array.isArray(data) ? data : []).forEach((plan) => {
      dict[`${plan.mealDate}_${plan.mealType}`] = {
        name: plan.name || "",
        linkedItem: plan.linkedFoodItemName || "",
        linkedFoodItemId: plan.linkedFoodItemId || null,
        planId: plan.id,
      };
    });
    return dict;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMealsLoading(true);
      try {
        const dict = await loadMealsForRange(rangeStartKey, rangeEndKey);
        if (!cancelled) setMeals(dict);
      } catch {
        if (!cancelled) setMeals({});
      } finally {
        if (!cancelled) setMealsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rangeStartKey, rangeEndKey]);

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
    return (
      meals[k] || {
        name: "",
        linkedItem: "",
        linkedFoodItemId: null,
        planId: null,
      }
    );
  };

  const openEditModal = (date, meal) => {
    const k = `${dayKey(date)}_${meal}`;
    const data = getMealData(date, meal);
    const prefillName =
      !data.name && pendingMealName ? pendingMealName : data.name || "";
    setMealName(prefillName);

    const preselectedId =
      !data.linkedFoodItemId && pendingPlanItem ? pendingPlanItem.id : null;
    setLinkedItemId(
      data.linkedFoodItemId
        ? String(data.linkedFoodItemId)
        : preselectedId
          ? String(preselectedId)
          : "",
    );

    if (!data.name && pendingMealName) {
      setPendingMealName(null);
    }

    if (preselectedId) {
      setDismissedInitialItemId(initialItem.id);
      onInitialItemConsumed?.();
    }

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

  const saveMealModal = async () => {
    if (!activeModal) return;
    const trimmedName = mealName.trim();
    const parsedLinkedId = linkedItemId ? Number(linkedItemId) : null;
    const existingEntry = meals[activeModal.key];

    // Nothing meaningful entered: no meal name and no linked ingredient.
    // Never round-trip a blank name to mealPlanApi.upsert() — some plan
    // records can exist with a blank name (e.g. a linked-ingredient-only
    // entry saved previously), which renders as a visually "empty" slot
    // but still has a real planId, and re-upserting blank data onto it
    // is rejected by the server. If there's an existing plan on this
    // slot, clear it via the dedicated delete endpoint instead; if there
    // isn't, just close the modal without any server call.
    if (!trimmedName && !parsedLinkedId) {
      if (existingEntry?.planId) {
        try {
          await mealPlanApi.delete(existingEntry.planId);
          setMeals((prev) => {
            const updated = { ...prev };
            delete updated[activeModal.key];
            return updated;
          });
          logActivity("Cleared planned meal");
        } catch {
          // Best-effort cleanup only. If this stale/blank-name record
          // can't be removed server-side right now (e.g. it's already
          // inconsistent from an earlier run), that is never something
          // the user should see or be blocked by — a blank Save Meal
          // click must always just close the modal quietly, with no
          // error surfaced, regardless of what this cleanup call does.
        }
      }
      setActiveModal(null);
      return;
    }

    try {
      const saved = await mealPlanApi.upsert({
        mealDate: dayKey(activeModal.date),
        mealType: activeModal.meal,
        name: mealName,
        linkedFoodItemId: parsedLinkedId,
      });

      setMeals((prev) => {
        const updated = { ...prev };
        if (!saved?.id) {
          delete updated[activeModal.key];
        } else {
          updated[activeModal.key] = {
            name: saved.name || "",
            linkedItem: saved.linkedFoodItemName || "",
            linkedFoodItemId: saved.linkedFoodItemId || null,
            planId: saved.id,
          };
        }
        return updated;
      });

      if (parsedLinkedId) {
        setInventoryItems((prev) =>
          prev.map((item) =>
            item.id === parsedLinkedId ? { ...item, reserved: true } : item,
          ),
        );
      }

      logActivity(`Planned meal: ${mealName || "Cleared slot"}`);
      setActiveModal(null);
    } catch (err) {
      setStatusTone("error");
      setStatusMessage(err.message || "Failed to save meal. Please try again.");
      setTimeout(() => setStatusMessage(""), 4000);
    }
  };

  const deleteMealSlot = async (key) => {
    const entry = meals[key];
    setMeals((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
    if (entry?.planId) {
      try {
        await mealPlanApi.delete(entry.planId);
        logActivity(`Removed planned meal: ${entry.name || "meal slot"}`);
      } catch (err) {
        setStatusTone("error");
        setStatusMessage(
          err.message || "Failed to remove meal. Please try again.",
        );
        setTimeout(() => setStatusMessage(""), 4000);
      }
    }
  };

  const handleConfirmWeeklyPlan = async () => {
    setConfirmingPlan(true);
    setStatusMessage("");
    try {
      const dict = await loadMealsForRange(rangeStartKey, rangeEndKey);
      setMeals(dict);
      logActivity("Confirmed weekly meal plan & scheduled reminders");
      setStatusTone("success");
      setStatusMessage(
        "Weekly plan confirmed! Ingredients are reserved and reminders are scheduled for the evening before each meal.",
      );
    } catch (err) {
      setStatusTone("error");
      setStatusMessage(
        err.message ||
          "Couldn't verify your weekly plan with the server. Please check your connection and try again.",
      );
    } finally {
      setConfirmingPlan(false);
      setTimeout(() => setStatusMessage(""), 5000);
    }
  };

  const today = dayKey(new Date());
  const cellBorder = `2px solid ${colors.greenLrgb}`;

  return (
    <div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1); }
        }

        .mp-fade-in {
          animation: fadeIn 0.5s ease-out backwards;
        }
        .mp-slide-in {
          animation: slideInUp 0.55s ease-out backwards;
        }

        .meal-cell-hover {
          transition: background-color 0.2s ease, box-shadow 0.2s ease;
          position: relative;
        }
        .meal-cell-hover:hover {
          background-color: #F3F9F4 !important;
          box-shadow: inset 0 0 0 1.5px ${colors.greenLrgb};
        }
        .meal-cell-hover .add-btn-trigger {
          opacity: 0;
          transform: scale(0.9);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .meal-cell-hover:hover .add-btn-trigger {
          opacity: 1;
          transform: scale(1);
        }
        .meal-card-item {
          background: #FFFFFF;
          border: 1px solid ${colors.greenLrgb};
          border-radius: 8px;
          padding: 8px 10px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.03);
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
          animation: popIn 0.25s ease-out;
        }
        .meal-card-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.08);
          border-color: ${colors.green};
        }

        .nav-arrow-btn {
          transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
        }
        .nav-arrow-btn:hover {
          background-color: ${colors.authGreen} !important;
          border-color: ${colors.green} !important;
          transform: translateY(-1px);
        }

        .view-switch-btn {
          transition: background 0.2s ease, color 0.2s ease;
        }
        .view-switch-btn:hover:not(.view-switch-active) {
          background: rgba(62, 160, 102, 0.12) !important;
          color: ${colors.greenD} !important;
        }

        .confirm-plan-btn {
          transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
        }
        .confirm-plan-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(62, 160, 102, 0.35);
        }
        .confirm-plan-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .mp-page-btn {
          transition: background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
        }
        .mp-page-btn:hover:not(:disabled) {
          border-color: ${colors.green} !important;
          background-color: ${colors.authGreen} !important;
        }

        .mp-inv-card {
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .mp-inv-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.06);
          border-color: ${colors.green} !important;
        }
      `}</style>

      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3 mp-fade-in">
        <div className="d-flex align-items-start gap-3">
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
        </div>

        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div
            className="d-flex align-items-center gap-2"
            style={{
              background: colors.white,
              border: `2px solid ${colors.greenLrgb}`,
              borderRadius: 10,
              padding: "0.45rem 0.9rem",
            }}
          >
            <ClipboardCheck size={16} color={colors.green} />
            <span
              className="small fw-semibold"
              style={{ color: colors.charcoal, whiteSpace: "nowrap" }}
            >
              {weekPlannedCount}/28 slots planned this week
            </span>
          </div>

          <button
            type="button"
            className="btn confirm-plan-btn d-inline-flex align-items-center gap-2"
            onClick={handleConfirmWeeklyPlan}
            disabled={confirmingPlan}
            style={{
              ...btnPrimaryStyle,
              color: colors.white,
              fontWeight: 600,
              padding: "0.55rem 1.25rem",
              fontSize: "0.9rem",
              borderRadius: 6,
              opacity: confirmingPlan ? 0.75 : 1,
            }}
          >
            <CheckCircle2
              size={20}
              style={
                confirmingPlan
                  ? { animation: "fadeIn 0.6s ease-in-out infinite alternate" }
                  : undefined
              }
            />
            {confirmingPlan ? "Confirming…" : "Confirm & Save Plan"}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`alert d-flex align-items-center gap-2 py-2 small mb-3 mp-slide-in ${
            statusTone === "error" ? "alert-danger" : "alert-success"
          }`}
        >
          <Bell size={16} /> {statusMessage}
        </div>
      )}

      {pendingPlanItem && (
        <div
          className="alert alert-info d-flex align-items-center justify-content-between gap-2 py-2 small mb-3 mp-slide-in"
          style={{
            border: `2px solid ${colors.greenLrgb}`,
            background: colors.low_greenFade,
          }}
        >
          <span>
            Planning a meal with <strong>{pendingPlanItem.name}</strong> - click
            a meal slot below to add it.
          </span>
          <button
            type="button"
            className="btn btn-link p-0"
            style={{
              fontSize: "0.95rem",
              textDecoration: "none",
              fontWeight: 800,
              color: colors.greenD,
            }}
            onClick={() => {
              setDismissedInitialItemId(initialItem.id);
              onInitialItemConsumed?.();
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {pendingMealName && (
        <div
          className="alert alert-info d-flex align-items-center justify-content-between gap-2 py-2 small mb-3 mp-slide-in"
          style={{
            border: `2px solid ${colors.greenLrgb}`,
            background: colors.low_greenFade,
          }}
        >
          <span>
            Recipe selected: <strong>{pendingMealName}</strong> - click a meal
            slot below to add it.
          </span>
          <button
            type="button"
            className="btn btn-link p-0"
            style={{
              fontSize: "0.95rem",
              textDecoration: "none",
              fontWeight: 800,
              color: colors.greenD,
            }}
            onClick={() => setPendingMealName(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mp-slide-in" style={{ animationDelay: "0.05s" }}>
        <SuggestedMeals onUseRecipe={(name) => setPendingMealName(name)} />
      </div>

      {/* Inventory Panel */}
      {inventoryLoading ? (
        <div
          className="rounded-4 p-4 mb-4 text-center small mp-slide-in"
          style={{
            background: colors.authGreen,
            border: `2px solid ${colors.greenLrgb}`,
            color: colors.muted,
            animationDelay: "0.1s",
          }}
        >
          Loading your inventory…
        </div>
      ) : (
        inventoryItems.length > 0 && (
          <div
            className="rounded-4 p-3 mb-4 mp-slide-in"
            style={{
              background: colors.authGreen,
              border: `2px solid ${colors.greenLrgb}`,
              animationDelay: "0.1s",
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
                      className="d-flex gap-3 p-2 rounded-3 h-100 mp-inv-card"
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
                        <div className="d-flex align-items-start justify-content-between gap-1">
                          <div
                            className="fw-bold text-truncate"
                            style={{
                              color: colors.greenD,
                              fontSize: "0.85rem",
                            }}
                            title={item.name}
                          >
                            {item.name}
                          </div>
                          {item.reserved && (
                            <span
                              className="flex-shrink-0"
                              title="Linked to a planned meal"
                              style={{
                                fontSize: "0.62rem",
                                fontWeight: 700,
                                color: colors.greenD,
                                backgroundColor: colors.authGreen,
                                padding: "1px 5px",
                                borderRadius: 4,
                                whiteSpace: "nowrap",
                              }}
                            >
                              Reserved
                            </span>
                          )}
                        </div>
                        <div
                          className="small"
                          style={{ color: colors.charcoal }}
                        >
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
                  className="btn btn-sm mp-page-btn d-flex align-items-center justify-content-center"
                  onClick={() => setInventoryPage((p) => Math.max(1, p - 1))}
                  disabled={currentInventoryPage === 1}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: `2px solid ${colors.greenLrgb}`,
                    background: "white",
                    padding: 0,
                    opacity: currentInventoryPage === 1 ? 0.5 : 1,
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
                  Page {currentInventoryPage} of {inventoryTotalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-sm mp-page-btn d-flex align-items-center justify-content-center"
                  onClick={() =>
                    setInventoryPage((p) =>
                      Math.min(inventoryTotalPages, p + 1),
                    )
                  }
                  disabled={currentInventoryPage === inventoryTotalPages}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: `2px solid ${colors.greenLrgb}`,
                    background: "white",
                    padding: 0,
                    opacity:
                      currentInventoryPage === inventoryTotalPages ? 0.5 : 1,
                  }}
                >
                  <ChevronRight size={14} color={colors.charcoal} />
                </button>
              </div>
            )}
          </div>
        )
      )}

      {/* Navigation & View Switcher */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2 mp-fade-in">
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm nav-arrow-btn d-flex align-items-center justify-content-center"
            onClick={navPrev}
            aria-label="Previous"
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
            className="btn btn-sm nav-arrow-btn d-flex align-items-center justify-content-center"
            onClick={navNext}
            aria-label="Next"
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
              className={`view-switch-btn${viewMode === mode ? " view-switch-active" : ""}`}
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
              }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Card View */}
      <div
        className="bg-white rounded-4 overflow-hidden mp-slide-in"
        style={{
          border: `2px solid ${colors.greenLrgb}`,
          boxShadow: shadows.sm,
          animationDelay: "0.15s",
        }}
      >
        {mealsLoading ? (
          <div
            className="text-center py-5 small"
            style={{ color: colors.muted }}
          >
            Loading your meal plan…
          </div>
        ) : viewMode === "week" ? (
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
                          background: isToday
                            ? "rgba(62, 160, 102, 0.14)"
                            : "transparent",
                          transition: "background-color 0.2s ease",
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
                {MEAL_TYPES.map((meal, mi) => {
                  const MealIcon = MEAL_TYPE_CONFIG[meal]?.icon;
                  return (
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
                          className="d-inline-flex align-items-center gap-1"
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            color: colors.charcoal,
                            opacity: 0.75,
                          }}
                        >
                          {MealIcon && (
                            <MealIcon size={13} color={colors.green} />
                          )}
                          {meal}
                        </span>
                      </td>
                      {weekDays.map((d, di) => {
                        const k = `${dayKey(d)}_${meal}`;
                        const mealData = getMealData(d, meal);
                        const isTodayCol = dayKey(d) === today;

                        return (
                          <td
                            key={di}
                            className="meal-cell-hover"
                            style={{
                              borderBottom:
                                mi < MEAL_TYPES.length - 1
                                  ? cellBorder
                                  : "none",
                              borderRight: di < 6 ? cellBorder : "none",
                              padding: "8px",
                              verticalAlign: "top",
                              minHeight: 105,
                              height: 105,
                              cursor: "pointer",
                              background: isTodayCol
                                ? "rgba(62, 160, 102, 0.05)"
                                : colors.white,
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
                  );
                })}
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
            animation: "fadeIn 0.2s ease-out",
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
              boxShadow: shadows.lg,
              animation: "popIn 0.2s ease-out",
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-2">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: colors.authGreen,
                  }}
                >
                  <Utensils size={16} color={colors.green} />
                </div>
                <h5 className="m-0 fw-bold" style={{ color: colors.charcoal }}>
                  Plan {activeModal.meal}
                </h5>
              </div>
              <button
                type="button"
                className="btn btn-link text-muted p-0"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
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
                value={linkedItemId}
                onChange={(e) => setLinkedItemId(e.target.value)}
                style={{
                  border: `1.5px solid ${colors.greenLrgb}`,
                  borderRadius: 8,
                }}
              >
                <option value="">No linked ingredient</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.quantity} {item.quantityUnit})
                    {item.reserved ? " — reserved" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="d-flex align-items-center justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-light fw-semibold mp-page-btn"
                onClick={() => setActiveModal(null)}
                style={{
                  borderRadius: 8,
                  border: `2px solid ${colors.greenLrgb}`,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn text-white fw-bold px-4 confirm-plan-btn"
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
