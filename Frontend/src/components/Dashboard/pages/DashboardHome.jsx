import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Package,
  Hourglass,
  CalendarCheck2,
  Leaf,
  Plus,
  Search,
  CalendarDays,
  Bell,
} from "lucide-react";
import { colors, fonts, shadows, btnPrimaryStyle } from "../../../theme";
import { analyticsApi, foodApi } from "../../../services/api";
import {
  getRecentActivity as getLocalActivity,
  onActivityLogged,
} from "../../../utils/activitylog";

const EXPIRING_WINDOW_DAYS = 7;

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry - today) / 86400000);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const CATEGORY_COLORS = {
  Vegetable: "#4ead77",
  Fruits: "#e8b84b",
  Meat: "#a8433c",
  Dairy: "#e3ded0",
  Other: colors.brownL,
};

const cardBase = {
  backgroundColor: colors.authGreen,
  border: `2px solid ${colors.greenLrgb}`,
  borderRadius: "0.75rem",
  boxShadow: shadows.sm,
};

const cardTitleStyle = {
  fontFamily: fonts.body,
  fontSize: "1rem",
  fontWeight: 700,
  color: colors.charcoal,
  margin: 0,
  opacity: 0.7,
};

const viewAllStyle = {
  fontFamily: fonts.body,
  fontSize: "0.85rem",
  fontWeight: 700,
  color: colors.green,
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
};

export default function DashboardHome({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [mealsPlanned, setMealsPlanned] = useState(null);
  const [foodSaved, setFoodSaved] = useState(null);
  const [impact, setImpact] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const displayedActivity = useMemo(
    () =>
      [...activity].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      ),
    [activity],
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const [inventory, meals, saved, recent, summary, communityImpact] =
        await Promise.all([
          foodApi.getAll(),
          foodApi.getMealsPlanned?.(),
          foodApi.getFoodSaved?.(),
          foodApi.getRecentActivity?.(),
          analyticsApi.getSummary("month"),
          analyticsApi.getCommunityImpact(),
        ]);
      setItems(Array.isArray(inventory) ? inventory : []);
      setMealsPlanned(
        typeof meals === "number" ? meals : (meals?.count ?? null),
      );
      // Prefer the period-aware analytics summary for the dashboard's
      // "Food Saved" stat so it matches the Analytics page (month view).
      setFoodSaved(
        typeof summary?.foodSavedCount === "number"
          ? summary.foodSavedCount
          : typeof saved === "number"
            ? saved
            : (saved?.count ?? null),
      );
      setImpact(communityImpact || null);

      if (Array.isArray(recent) && recent.length > 0) {
        // Backend returns FoodActivityLog entries; map to the local activity shape
        const mapped = recent.slice(0, 6).map((r) => {
          const type = r.type || "";
          let title = "";
          if (type === "USED") title = `Used ${r.category || "an item"}`;
          else if (type === "DONATED")
            title = `Donated ${r.category || "an item"}`;
          else if (type === "WASTED")
            title = `Expired ${r.category || "an item"}`;
          else title = `${type} ${r.category || "item"}`;
          return { id: r.id, title, timestamp: r.occurredAt };
        });
        setActivity(mapped);
      } else {
        setActivity(getLocalActivity(6));
      }
    } catch (err) {
      setErrMsg(err.message || "Failed to load dashboard data.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await loadDashboard();
      if (cancelled) return;
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  useEffect(() => {
    return onActivityLogged(() => setActivity(getLocalActivity(6)));
  }, []);

  const expiringSoon = useMemo(() => {
    return items
      .map((item) => ({ ...item, daysLeft: daysUntil(item.expiryDate) }))
      .filter(
        (item) =>
          item.daysLeft !== null &&
          item.daysLeft >= 0 &&
          item.daysLeft <= EXPIRING_WINDOW_DAYS,
      )
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [items]);

  const categoryBreakdown = useMemo(() => {
    if (items.length === 0) return [];
    const counts = items.reduce((acc, item) => {
      const cat = item.category || "Other";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([label, count]) => ({
        label,
        count,
        pct: Math.round((count / items.length) * 100),
        color: CATEGORY_COLORS[label] || colors.brownL,
      }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const stats = [
    {
      label: "Items in Stock",
      value: items.length,
      caption: "Total food items",
      icon: Package,
      to: "inventory",
    },
    {
      label: "Expiring Soon",
      value: expiringSoon.length,
      caption: `Items in next ${EXPIRING_WINDOW_DAYS} days`,
      icon: Hourglass,
      to: "expiry",
    },
    {
      label: "Meals Planned",
      value: mealsPlanned ?? "—",
      caption: "This week",
      icon: CalendarCheck2,
      to: "meal-planner",
    },
    {
      label: "Food Saved",
      value: foodSaved ?? impact?.foodSavedCount ?? "—",
      caption: "This month",
      icon: Leaf,
      to: "analytics",
    },
  ];

  const quickActions = [
    { label: "Add Food Items", icon: Plus, to: "add-food" },
    { label: "Browse Food", icon: Search, to: "browse" },
    { label: "Meal Planner", icon: CalendarDays, to: "meal-planner" },
    { label: "Expiry Alerts", icon: Bell, to: "expiry" },
  ];

  return (
    <div style={{ fontFamily: fonts.body }}>
      <style>{`
        .btn-dashboard-action {
          opacity: 0.75;
          transition: opacity 0.2s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
        }

        .btn-dashboard-action:hover:not(:disabled) {
          opacity: 1;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
        }

        .recent-activity-scroll {
          max-height: 280px;
          overflow-y: auto;
          padding-right: 4px;
          scrollbar-width: thin;
        }

        .recent-activity-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .recent-activity-scroll::-webkit-scrollbar-thumb {
          background: rgba(78, 160, 102, 0.45);
          border-radius: 999px;
        }

        .recent-activity-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
      <h1
        style={{
          fontFamily: fonts.body,
          fontSize: "1.60rem",
          fontWeight: 700,
          color: colors.charcoal,
          opacity: 0.85,
          margin: 0,
        }}
      >
        Dashboard
      </h1>
      <p
        style={{
          color: colors.muted,
          marginTop: "0.35rem",
          marginBottom: "1.75rem",
        }}
      >
        Welcome back! Here&apos;s your food overview.
      </p>

      {errMsg && (
        <div className="alert alert-danger py-2 small mb-3">{errMsg}</div>
      )}

      {/* ---------- Stat cards ---------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        {stats.map(({ label, value, caption, icon: Icon, to }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate?.(to)}
            style={{
              ...cardBase,
              padding: "1.25rem 1.4rem",
              textAlign: "left",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = shadows.md)}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = shadows.sm)}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: colors.charcoal,
                  opacity: 0.7,
                }}
              >
                {label}
              </span>
              <Icon size={50} color={colors.greenL} strokeWidth={2} />
            </div>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "3rem",
                opacity: 0.7,
                fontWeight: 700,
                color: colors.charcoal,
                margin: "0.35rem 0 0.15rem",
              }}
            >
              {loading ? "…" : value}
            </div>
            <div style={{ fontSize: "0.9rem", color: colors.muted }}>
              {caption}
            </div>
          </button>
        ))}
      </div>

      {/* ---------- Main grid: Expiring / Inventory / Activity ---------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 1.15fr 1fr",
          gap: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Expiring Soon */}
        <div style={{ ...cardBase, padding: "1.25rem 1.4rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2 style={cardTitleStyle}>Expiring Soon</h2>
            <button
              type="button"
              style={viewAllStyle}
              onClick={() => onNavigate?.("expiry")}
            >
              View All
            </button>
          </div>

          {loading ? (
            <div style={{ color: colors.muted, fontSize: "0.85rem" }}>
              Loading…
            </div>
          ) : expiringSoon.length === 0 ? (
            <div style={{ color: colors.muted, fontSize: "0.85rem" }}>
              Nothing expiring in the next {EXPIRING_WINDOW_DAYS} days.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              {expiringSoon.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "none",
                    gap: "0.75rem",
                  }}
                >
                  <img
                    src={
                      item.imageUrl ||
                      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"
                    }
                    alt={item.name || "Food item"}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: 4,
                      backgroundColor: colors.low_greenFade,
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: colors.charcoal,
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: colors.muted }}>
                      Exp: {formatDate(item.expiryDate)} ({item.daysLeft} day
                      {item.daysLeft === 1 ? "" : "s"} left)
                    </div>
                  </div>
                  <span
                    style={{
                      backgroundColor: colors.showcase_green,
                      borderRadius: 4,
                      color: colors.charcoal,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "0.3rem 0.65rem",
                      whiteSpace: "nowrap",
                      boxShadow: "0 0px 2px rgb(169, 169, 169)",
                    }}
                  >
                    {item.daysLeft + " day" + (item.daysLeft === 1 ? "" : "s")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory Overview */}
        <div
          style={{
            ...cardBase,
            padding: "1.25rem 1.4rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2 style={cardTitleStyle}>Inventory Overview</h2>
            <button
              type="button"
              style={viewAllStyle}
              onClick={() => onNavigate?.("inventory")}
            >
              View All
            </button>
          </div>

          {loading ? (
            <div style={{ color: colors.muted, fontSize: "0.85rem" }}>
              Loading…
            </div>
          ) : categoryBreakdown.length === 0 ? (
            <div
              style={{ color: colors.muted, fontSize: "0.85rem", flexGrow: 1 }}
            >
              No items yet - add your first item to see a breakdown.
            </div>
          ) : (
            <div
              style={{
                flexGrow: 1,
                display: "flex",
                alignItems: "center",
                gap: "1.75rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "0.9rem",
                  height: "140px",
                }}
              >
                {categoryBreakdown.map((cat) => (
                  <div
                    key={cat.label}
                    title={`${cat.label}: ${cat.pct}%`}
                    style={{
                      width: "26px",
                      height: `${Math.max(cat.pct, 8) * 1.3}px`,
                      borderRadius: "13px",
                      backgroundColor: cat.color,
                      border:
                        cat.label === "Dairy"
                          ? `2px solid ${colors.border}`
                          : "none",
                    }}
                  />
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.55rem",
                }}
              >
                {categoryBreakdown.map((cat) => (
                  <div
                    key={cat.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: cat.color,
                        border:
                          cat.label === "Dairy"
                            ? `1.5px solid ${colors.border}`
                            : "none",
                        display: "inline-block",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.82rem",
                        color: colors.charcoal,
                        minWidth: "72px",
                      }}
                    >
                      {cat.label}
                    </span>
                    <span style={{ fontSize: "0.82rem", color: colors.muted }}>
                      {cat.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: "1rem",
              fontSize: "0.9rem",
              color: colors.charcoal,
            }}
          >
            Total Items:{" "}
            <span
              style={{
                fontWeight: 800,
                color: colors.green,
                fontSize: "1.05rem",
              }}
            >
              {loading ? "…" : items.length}
            </span>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ ...cardBase, padding: "1.25rem 1.4rem" }}>
          <h2 style={{ ...cardTitleStyle, marginBottom: "1rem" }}>
            Recent Activity
          </h2>
          {loading ? (
            <div style={{ color: colors.muted, fontSize: "0.85rem" }}>
              Loading…
            </div>
          ) : activity.length === 0 ? (
            <div style={{ color: colors.muted, fontSize: "0.85rem" }}>
              No recent activity yet.
            </div>
          ) : (
            <div
              className="recent-activity-scroll"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.9rem",
              }}
            >
              {displayedActivity.slice(-6).map((a) => (
                <div
                  key={a.id || a.title + a.time}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: colors.charcoal,
                      }}
                    >
                      {a.title}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: colors.muted }}>
                      {a.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------- Quick Actions ---------- */}
      <div style={{ ...cardBase, padding: "1.25rem 1.4rem" }}>
        <h2 style={{ ...cardTitleStyle, marginBottom: "1rem" }}>
          Quick Actions
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}
        >
          {quickActions.map(({ label, icon: Icon, to }) => (
            <button
              key={label}
              type="button"
              className="btn btn-primary btn-dashboard-action"
              onClick={() => onNavigate?.(to)}
              style={{
                ...btnPrimaryStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.55rem",
                border: "none",
                backgroundColor: colors.green,
                color: colors.white,
                cursor: "pointer",
                padding: "0.85rem 1.60rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                borderRadius: 6,
              }}
            >
              <Icon size={22} strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
