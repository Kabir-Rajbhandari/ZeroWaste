import { useEffect, useMemo, useState } from "react";
import {
  Leaf,
  HeartHandshake,
  Recycle,
  Download,
  Clock,
  ClipboardList,
} from "lucide-react";
import { btnPrimaryStyle, colors, fonts, shadows } from "../../../theme";
import { analyticsApi, foodApi } from "../../../services/api";
import DateRangePicker, { toISODate } from "../DateRangePicker";
import { useCountUp } from "../../../utils/useCountUp";
import { onActivityLogged } from "../../../utils/activitylog";
import {
  formatActivityTime,
  getActivityConfig,
  mapBackendActivity,
  mergeActivity,
} from "../../../utils/activityDisplay";

const CATEGORY_COLORS = {
  Vegetable: "#4ead77",
  Fruits: "#e8b84b",
  Meat: "#a8433c",
  Dairy: "#e3ded0",
  Other: "#8c9bb5",
};

const CATEGORY_LABELS = {
  Vegetable: "Vegetables",
  Fruits: "Fruits",
  Meat: "Meat",
  Dairy: "Dairy",
  Other: "Other",
};

function DonutChart({
  data,
  size = 170,
  strokeWidth = 25,
  selectedCategory,
  onSelectCategory,
  animationDelay = 0,
}) {
  const [isAnimating, setIsAnimating] = useState(true);

  const padding = 10;
  const radius = (size - strokeWidth - padding) / 2;
  const circumference = 2 * Math.PI * radius;

  // Build chart segments without mutating a render-scoped variable.
  const segments = data.reduce((acc, d) => {
    if (d.percent <= 0) return acc;

    const prevCumulative =
      acc.length > 0 ? acc[acc.length - 1].cumulativeEnd : 0;

    const cumulativeEnd = prevCumulative + (d.percent / 100) * circumference;

    acc.push({
      ...d,
      dashoffset: -prevCumulative,
      cumulativeEnd,
    });

    return acc;
  }, []);

  useEffect(() => {
    const timer = setTimeout(
      () => setIsAnimating(false),
      1200 + animationDelay,
    );

    return () => clearTimeout(timer);
  }, [animationDelay]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="flex-shrink-0"
      style={{
        overflow: "visible",
        opacity: 0.9,
        transition: "opacity 0.3s ease",
      }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#DEE5D4"
        strokeWidth={strokeWidth}
      />

      {segments.map((d) => {
        const safePercent = d.percent >= 100 ? 99.999 : d.percent;

        const length = (safePercent / 100) * circumference;

        const dasharray = `${length} ${circumference - length}`;

        const dashoffset = d.dashoffset;

        const isSelected = selectedCategory === d.category;

        const isDimmed = selectedCategory && !isSelected;

        return (
          <circle
            key={d.category}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={CATEGORY_COLORS[d.category] || colors.muted}
            strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
            strokeDasharray={isAnimating ? circumference : dasharray}
            strokeDashoffset={isAnimating ? -circumference : dashoffset}
            strokeOpacity={isDimmed ? 0.35 : 1}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              cursor: onSelectCategory ? "pointer" : "default",
              transition: `stroke-dasharray 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) ${animationDelay}ms,
                            stroke-width 0.15s,
                            stroke-opacity 0.15s`,
            }}
            onClick={() => onSelectCategory?.(d.category)}
          >
            <title>
              {`${
                CATEGORY_LABELS[d.category] || d.category
              }: ${d.percent}% (click to filter)`}
            </title>
          </circle>
        );
      })}
    </svg>
  );
}

function BarChart({
  data,
  height = 170,
  selectedCategory,
  onSelectCategory,
  animationDelay = 0,
}) {
  const [isAnimating, setIsAnimating] = useState(true);

  const max = Math.max(...data.map((d) => d.percent), 1);

  useEffect(() => {
    const timer = setTimeout(
      () => setIsAnimating(false),
      1000 + animationDelay,
    );

    return () => clearTimeout(timer);
  }, [animationDelay]);

  return (
    <div
      className="d-flex align-items-end gap-4 flex-shrink-0"
      style={{ height }}
    >
      {data.map((d, idx) => {
        const isSelected = selectedCategory === d.category;

        const isDimmed = selectedCategory && !isSelected;

        const targetHeight =
          d.percent > 0 ? Math.max((d.percent / max) * (height - 24), 6) : 2;

        return (
          <div
            key={d.category}
            className="d-flex flex-column align-items-center justify-content-end h-100"
            style={{
              width: 36,
              cursor: onSelectCategory ? "pointer" : "default",
            }}
            onClick={() => onSelectCategory?.(d.category)}
            title={`${CATEGORY_LABELS[d.category] || d.category}: ${d.percent}% (click to filter)`}
          >
            <div
              style={{
                width: 30,
                height: isAnimating ? "2px" : `${targetHeight}px`,
                background: CATEGORY_COLORS[d.category] || colors.muted,
                borderRadius: "6px 6px 2px 2px",
                opacity: isDimmed ? 0.35 : 1,
                outline: isSelected ? `2px solid ${colors.charcoal}` : "none",
                outlineOffset: 2,
                transition: `height 1s cubic-bezier(0.34, 1.56, 0.64, 1) ${
                  animationDelay + idx * 100
                }ms, opacity 0.15s`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function Legend({ data, selectedCategory, onSelectCategory }) {
  return (
    <div
      className="d-flex flex-column gap-2 flex-grow-1"
      style={{ minWidth: 140 }}
    >
      {data.map((d) => {
        const isSelected = selectedCategory === d.category;

        return (
          <div
            key={d.category}
            className="d-flex align-items-center gap-2"
            style={{
              cursor: onSelectCategory ? "pointer" : "default",
              opacity: selectedCategory && !isSelected ? 0.5 : 1,
              fontWeight: isSelected ? 700 : 400,
              transition: "opacity 0.2s ease, font-weight 0.2s ease",
            }}
            onClick={() => onSelectCategory?.(d.category)}
          >
            <span
              className="rounded-circle flex-shrink-0"
              style={{
                width: 10,
                height: 10,
                background: CATEGORY_COLORS[d.category] || colors.muted,
                border:
                  d.category === "Dairy"
                    ? `1px solid ${colors.border}`
                    : "none",
              }}
            />

            <span className="small" style={{ color: colors.charcoal }}>
              {CATEGORY_LABELS[d.category] || d.category}
            </span>

            <span
              className="small fw-semibold ms-auto"
              style={{ color: colors.muted }}
            >
              {d.percent}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sublabel, delay = 0 }) {
  const isNumeric = typeof value === "number";

  const animatedValue = useCountUp(isNumeric ? value : 0, 2000, isNumeric);

  const displayValue = isNumeric ? animatedValue : value;

  return (
    <div
      className="rounded-4 p-4 flex-grow-1 stat-card-animated"
      style={{
        background: colors.authGreen,
        border: `2px solid ${colors.greenLrgb}`,
        minWidth: 220,
        animation: `slideInUp 0.6s ease-out ${delay}ms backwards`,
        transition:
          "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";

        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        className="small fw-semibold mb-2"
        style={{ color: colors.charcoal }}
      >
        {label}
      </div>

      <div className="d-flex align-items-center justify-content-between">
        <span
          style={{
            opacity: 0.7,
            fontFamily: fonts.body,
            fontSize: "3rem",
            fontWeight: 700,
            color: colors.charcoal,
            transition: "transform 0.3s ease",
          }}
        >
          {displayValue}
        </span>

        <Icon
          size={30}
          color={colors.authGreen}
          style={{
            transition: "transform 0.3s ease",
          }}
        />
      </div>

      {sublabel && (
        <div className="small mt-2" style={{ color: colors.muted }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

const CATEGORY_OPTIONS = [
  "All",
  "Vegetable",
  "Fruits",
  "Meat",
  "Dairy",
  "Other",
];

export default function Analytics() {
  /*
   * Keep "month" as the initial API period so the dashboard
   * loads immediately when the Analytics page opens.
   *
   * Once the user chooses a date preset/range, the picker
   * changes this to "custom" and sends the exact dates.
   */
  const [period, setPeriod] = useState("month");

  const [category, setCategory] = useState("All");

  const [customRange, setCustomRange] = useState({
    start: null,
    end: null,
  });

  const [summary, setSummary] = useState(null);

  const [inventoryOverview, setInventoryOverview] = useState(null);

  const [foodSavedBreakdown, setFoodSavedBreakdown] = useState(null);

  const [wasteBreakdown, setWasteBreakdown] = useState(null);

  const [loading, setLoading] = useState(true);

  const [errMsg, setErrMsg] = useState("");

  const [isCategoryHovered, setIsCategoryHovered] = useState(false);

  // Logged Activities panel — reuses the same activity feed as the
  // Dashboard's "Recent Activity" card, but fetched in bulk and filtered
  // client-side so it always matches whatever date range / category the
  // rest of this page is currently filtered to.
  const [rawActivity, setRawActivity] = useState([]);

  const [activityLoading, setActivityLoading] = useState(true);

  /*
   * Build the exact date range sent to the API.
   *
   * For custom/date-picker selections:
   * {
   *   startDate: "2026-08-11",
   *   endDate: "2026-08-17"
   * }
   */
  const rangeParam =
    period === "custom" && customRange.start && customRange.end
      ? {
          startDate: toISODate(customRange.start),
          endDate: toISODate(customRange.end),
        }
      : null;

  /*
   * The user may click only the first calendar date.
   * Wait until both start and end are available.
   */
  const awaitingCustomRange = period === "custom" && !rangeParam;

  /*
   * Reload analytics whenever:
   *
   * - selected period changes
   * - category changes
   * - custom start changes
   * - custom end changes
   *
   * The cancellation flag prevents an older request from
   * overwriting a newer filter selection.
   */
  useEffect(() => {
    if (awaitingCustomRange) {
      return;
    }

    let cancelled = false;

    const loadAnalytics = async () => {
      setLoading(true);
      setErrMsg("");

      try {
        const [summaryData, inventoryData, savedData, wasteData] =
          await Promise.all([
            analyticsApi.getSummary(period, category, rangeParam),

            analyticsApi.getInventoryOverview(category),

            analyticsApi.getFoodSavedBreakdown(period, category, rangeParam),

            analyticsApi.getWasteBreakdown(period, category, rangeParam),
          ]);

        if (cancelled) {
          return;
        }

        setSummary(summaryData);
        setInventoryOverview(inventoryData);
        setFoodSavedBreakdown(savedData);
        setWasteBreakdown(wasteData);
      } catch (err) {
        if (!cancelled) {
          setErrMsg(err?.message || "Failed to load analytics.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [
    period,
    category,
    customRange.start,
    customRange.end,
    awaitingCustomRange,
  ]);

  /*
   * Load the logged-activity feed once (a generous limit so client-side
   * filtering below has enough history to work with), then keep it fresh
   * whenever a new activity is logged elsewhere in the app.
   */
  useEffect(() => {
    let cancelled = false;

    const loadActivity = async () => {
      setActivityLoading(true);
      try {
        const recent = await foodApi.getRecentActivity?.(200);
        if (!cancelled) {
          setRawActivity(mergeActivity(mapBackendActivity(recent), 200));
        }
      } catch {
        if (!cancelled) {
          setRawActivity([]);
        }
      } finally {
        if (!cancelled) {
          setActivityLoading(false);
        }
      }
    };

    loadActivity();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return onActivityLogged(async () => {
      try {
        const recent = await foodApi.getRecentActivity?.(200);
        setRawActivity(mergeActivity(mapBackendActivity(recent), 200));
      } catch {
        // keep whatever was already loaded
      }
    });
  }, []);

  /*
   * Same [start, end] window the backend resolves for the charts above
   * (see AnalyticsService#resolveRange): a custom picked range wins when
   * present, otherwise it's the start of the current month through now.
   */
  const activityRange = useMemo(() => {
    if (rangeParam) {
      const start = new Date(customRange.start);
      start.setHours(0, 0, 0, 0);

      const end = new Date(customRange.end);
      end.setHours(23, 59, 59, 999);

      return { start, end };
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    return { start, end: now };
  }, [rangeParam, customRange.start, customRange.end]);

  const filteredActivity = useMemo(() => {
    return rawActivity.filter((a) => {
      const t = new Date(a.timestamp);

      if (t < activityRange.start || t > activityRange.end) return false;

      if (category !== "All" && a.category !== category) return false;

      return true;
    });
  }, [rawActivity, activityRange, category]);

  /*
   * Clicking a chart/legend category toggles the
   * category filter.
   */
  const handleSelectCategory = (clicked) => {
    setCategory((current) => (current === clicked ? "All" : clicked));
  };

  const handleExport = () => {
    window.print();
  };

  /*
   * Clear selected date range from the heading
   * and return API filtering to the default month.
   */
  const handleClearDateRange = () => {
    setCustomRange({
      start: null,
      end: null,
    });

    setPeriod("month");
  };

  return (
    <div id="analytics-print-area">
      <style>{`
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

        @keyframes fadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @media print {
          body * {
            visibility: hidden;
          }

          #analytics-print-area,
          #analytics-print-area * {
            visibility: visible;
          }

          #analytics-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px;
          }

          #analytics-export-controls {
            display: none !important;
          }
        }

        .btn-export-report {
          opacity: 0.75;
          transition:
            opacity 0.2s ease,
            background 0.25s ease,
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .btn-export-report:hover:not(:disabled) {
          opacity: 1;
          transform: translateY(-1px);
          box-shadow:
            0 8px 20px rgba(0, 0, 0, 0.16);
        }

        .analytics-chart-container {
          animation:
            slideInUp 0.6s ease-out backwards;
        }

        .analytics-chart-container:nth-child(1) {
          animation-delay: 0.3s;
        }

        .analytics-chart-container:nth-child(2) {
          animation-delay: 0.4s;
        }

        .analytics-chart-container:nth-child(3) {
          animation-delay: 0.5s;
        }

        .stat-card-animated:hover {
          transform: translateY(-8px) !important;
        }

        .analytics-activity-item {
          animation: fadeIn 0.4s ease-out backwards;
        }

        .analytics-activity-scroll {
          max-height: 360px;
          overflow-y: auto;
          padding-right: 4px;
          scrollbar-width: thin;
        }

        .analytics-activity-scroll::-webkit-scrollbar {
          width: 5px;
        }

        .analytics-activity-scroll::-webkit-scrollbar-thumb {
          background: rgba(78, 160, 102, 0.45);
          border-radius: 999px;
        }

        .analytics-activity-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>

      {/* =====================================================
          HEADER + FILTER CONTROLS
          ===================================================== */}
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div>
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
            Analytics
          </h1>

          <p className="mb-0" style={{ color: colors.muted }}>
            Track your food-saving progress and waste reduction impact.
          </p>

          {/* Selected date range */}
          {period === "custom" && customRange.start && customRange.end && (
            <p
              className="mb-0 mt-1 small d-flex align-items-center gap-2"
              style={{
                color: colors.green,
                fontWeight: 600,
              }}
            >
              {customRange.start.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}

              {" – "}

              {customRange.end.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}

              <button
                type="button"
                onClick={handleClearDateRange}
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  color: colors.muted,
                  fontSize: "1.1rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                clear
              </button>
            </p>
          )}

          {/* Selected category */}
          {category !== "All" && (
            <p
              className="mb-0 mt-1 small d-flex align-items-center gap-2"
              style={{
                color: colors.green,
                fontWeight: 600,
              }}
            >
              Filtered to {CATEGORY_LABELS[category] || category}
              <button
                type="button"
                onClick={() => setCategory("All")}
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  color: colors.muted,
                  fontSize: "1.1rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                clear
              </button>
            </p>
          )}
        </div>

        {/* 
            FILTER CONTROLS
            DateRangePicker is only period filter.
            */}
        <div
          id="analytics-export-controls"
          className="d-flex align-items-center gap-3 flex-wrap"
        >
          <DateRangePicker
            value={customRange}
            onChange={(range) => {
              setCustomRange(range);
              setPeriod("custom");
            }}
            onClear={() => {
              setCustomRange({
                start: null,
                end: null,
              });

              setPeriod("month");
            }}
          />

          {/* Category filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onMouseEnter={() => setIsCategoryHovered(true)}
            onMouseLeave={() => setIsCategoryHovered(false)}
            aria-label="Filter analytics by category"
            style={{
              opacity: isCategoryHovered ? 1 : 0.8,
              border: `2px solid ${colors.green}`,
              borderRadius: 6,
              background: colors.white,
              color: colors.charcoal,
              boxShadow: isCategoryHovered ? shadows.md : "none",
              fontSize: "0.85rem",
              fontWeight: 600,
              padding: "0.5rem 0.85rem",
              cursor: "pointer",
              transition: "opacity 0.2s ease, box-shadow 0.25s ease",
            }}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "All Categories" : CATEGORY_LABELS[c] || c}
              </option>
            ))}
          </select>

          {/* Export */}
          <button
            type="button"
            className="btn btn-export-report d-inline-flex align-items-center gap-2 outline-export"
            style={{
              ...btnPrimaryStyle,
              border: `2px solid ${colors.green}`,
              color: colors.white,
              padding: "0.50rem 1rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              borderRadius: 6,
              cursor: "pointer",
            }}
            onClick={handleExport}
          >
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* Error */}
      {errMsg && (
        <div className="alert alert-danger py-2 small mb-3">{errMsg}</div>
      )}

      {/* CONTENT STATES */}

      {/* Waiting for second date */}
      {awaitingCustomRange ? (
        <div className="text-center py-5" style={{ color: colors.muted }}>
          Pick a start and end date to view analytics for your selected range.
        </div>
      ) : loading ? (
        <div className="text-center py-5" style={{ color: colors.muted }}>
          Loading analytics…
        </div>
      ) : !summary?.foodSavedCount && !summary?.donationsMadeCount ? (
        /* No analytics data */
        <div
          className="text-center py-5 rounded-4"
          style={{
            background: colors.authGreen,
            border: `2px dashed ${colors.greenLrgb}`,
            color: colors.charcoal,
          }}
        >
          <Leaf
            size={40}
            style={{
              opacity: 0.6,
              marginBottom: "0.75rem",
            }}
          />

          <h5
            style={{
              fontFamily: fonts.body,
              fontWeight: 700,
            }}
          >
            No food-saving data yet
          </h5>

          <p
            style={{
              color: colors.muted,
              marginBottom: 0,
            }}
          >
            Start logging items in your Food Inventory and marking them as used
            or donated to see your impact here.
          </p>
        </div>
      ) : (
        <>
          {/* 
              STAT CARDS
              */}
          <div className="d-flex flex-wrap gap-3 mb-4">
            <StatCard
              icon={Leaf}
              label="Food Saved"
              value={summary?.foodSavedCount ?? 0}
              sublabel="items marked used in selected range"
              delay={0}
            />

            <StatCard
              icon={HeartHandshake}
              label="Donations Made"
              value={summary?.donationsMadeCount ?? 0}
              sublabel="donations in selected range"
              delay={100}
            />

            <StatCard
              icon={Recycle}
              label="Waste Reduced"
              value={`${summary?.wasteReducedPercent ?? 0}%`}
              sublabel="of items saved or donated in selected range"
              delay={200}
            />
          </div>

          {/* 
              CHARTS
              */}
          <div className="row g-4">
            {/* Inventory Overview */}
            <div className="col-12 col-lg-4 analytics-chart-container">
              <div
                className="rounded-4 p-4 h-100"
                style={{
                  background: colors.authGreen,
                  border: `2px solid ${colors.greenLrgb}`,
                }}
              >
                <h6
                  className="fw-bold mb-3"
                  style={{
                    color: colors.charcoal,
                  }}
                >
                  Inventory Overview
                </h6>

                <div className="d-flex align-items-center gap-4 flex-wrap">
                  <DonutChart
                    data={inventoryOverview?.breakdown || []}
                    selectedCategory={category !== "All" ? category : null}
                    onSelectCategory={handleSelectCategory}
                    animationDelay={350}
                  />

                  <Legend
                    data={inventoryOverview?.breakdown || []}
                    selectedCategory={category !== "All" ? category : null}
                    onSelectCategory={handleSelectCategory}
                  />
                </div>

                <div
                  className="text-end mt-3 small"
                  style={{
                    color: colors.muted,
                  }}
                >
                  Total Items:{" "}
                  <span
                    className="fw-bold"
                    style={{
                      color: colors.charcoal,
                    }}
                  >
                    {inventoryOverview?.totalItems ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Food Saved */}
            <div className="col-12 col-lg-4 analytics-chart-container">
              <div
                className="rounded-4 p-4 h-100"
                style={{
                  background: colors.authGreen,
                  border: `2px solid ${colors.greenLrgb}`,
                }}
              >
                <h6
                  className="fw-bold mb-3"
                  style={{
                    color: colors.charcoal,
                  }}
                >
                  Food Saved
                </h6>

                <div className="d-flex align-items-center gap-4 flex-wrap">
                  <BarChart
                    data={foodSavedBreakdown?.breakdown || []}
                    selectedCategory={category !== "All" ? category : null}
                    onSelectCategory={handleSelectCategory}
                    animationDelay={450}
                  />

                  <Legend
                    data={foodSavedBreakdown?.breakdown || []}
                    selectedCategory={category !== "All" ? category : null}
                    onSelectCategory={handleSelectCategory}
                  />
                </div>

                <div
                  className="text-end mt-3 small"
                  style={{
                    color: colors.muted,
                  }}
                >
                  Total Items:{" "}
                  <span
                    className="fw-bold"
                    style={{
                      color: colors.charcoal,
                    }}
                  >
                    {foodSavedBreakdown?.totalItems ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Waste by Category */}
            <div className="col-12 col-lg-4 analytics-chart-container">
              <div
                className="rounded-4 p-4 h-100"
                style={{
                  background: colors.authGreen,
                  border: `2px solid ${colors.greenLrgb}`,
                }}
              >
                <h6
                  className="fw-bold mb-3"
                  style={{
                    color: colors.charcoal,
                  }}
                >
                  Waste by Category
                </h6>

                <p
                  className="small mb-3"
                  style={{
                    color: colors.muted,
                    marginTop: "-0.5rem",
                  }}
                >
                  Which categories are actually spoiling, not just being used or
                  donated.
                </p>

                <div className="d-flex align-items-center gap-4 flex-wrap">
                  <DonutChart
                    data={wasteBreakdown?.breakdown || []}
                    selectedCategory={category !== "All" ? category : null}
                    onSelectCategory={handleSelectCategory}
                    animationDelay={550}
                  />

                  <Legend
                    data={wasteBreakdown?.breakdown || []}
                    selectedCategory={category !== "All" ? category : null}
                    onSelectCategory={handleSelectCategory}
                  />
                </div>

                <div
                  className="text-end mt-3 small"
                  style={{
                    color: colors.muted,
                  }}
                >
                  Total Items:{" "}
                  <span
                    className="fw-bold"
                    style={{
                      color: colors.charcoal,
                    }}
                  >
                    {wasteBreakdown?.totalItems ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 
              LOGGED ACTIVITIES
              */}
          <div className="row g-4 mt-1">
            <div className="col-12 analytics-chart-container">
              <div
                className="rounded-4 p-4"
                style={{
                  background: colors.authGreen,
                  border: `2px solid ${colors.greenLrgb}`,
                }}
              >
                <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-1">
                  <div className="d-flex align-items-start gap-2">
                    <ClipboardList
                      size={20}
                      style={{ color: colors.green, marginTop: 2 }}
                    />

                    <div>
                      <h6
                        className="fw-bold mb-1"
                        style={{ color: colors.charcoal }}
                      >
                        Logged Activities
                      </h6>

                      <p className="small mb-0" style={{ color: colors.muted }}>
                        Every inventory, donation and meal-planning action
                        recorded for the selected range
                        {category !== "All"
                          ? ` in ${CATEGORY_LABELS[category] || category}`
                          : ""}
                        .
                      </p>
                    </div>
                  </div>

                  <span
                    className="small fw-semibold flex-shrink-0"
                    style={{
                      background: colors.white,
                      border: `1px solid ${colors.greenLrgb}`,
                      borderRadius: 999,
                      padding: "0.3rem 0.85rem",
                      color: colors.green,
                    }}
                  >
                    {filteredActivity.length}{" "}
                    {filteredActivity.length === 1 ? "activity" : "activities"}
                  </span>
                </div>

                {activityLoading ? (
                  <div
                    className="text-center py-4 small"
                    style={{ color: colors.muted }}
                  >
                    Loading activity log…
                  </div>
                ) : filteredActivity.length === 0 ? (
                  <div
                    className="text-center py-4 small"
                    style={{ color: colors.muted }}
                  >
                    No logged activity for this range yet.
                  </div>
                ) : (
                  <div
                    className="analytics-activity-scroll mt-3"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.65rem",
                    }}
                  >
                    {filteredActivity.map((a, idx) => {
                      const config = getActivityConfig(a.type);

                      return (
                        <div
                          key={a.id}
                          className="analytics-activity-item"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.75rem",
                            backgroundColor: colors.white,
                            padding: "0.65rem 0.85rem",
                            borderRadius: "0.75rem",
                            border: "1px solid #E5E7EB",
                            animationDelay: `${Math.min(idx, 20) * 30}ms`,
                            transition:
                              "transform 0.15s ease, box-shadow 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform =
                              "translateY(-1px)";
                            e.currentTarget.style.boxShadow =
                              "0 4px 10px rgba(0, 0, 0, 0.05)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <div
                            className="d-flex align-items-center gap-2"
                            style={{ minWidth: 0, flexGrow: 1 }}
                          >
                            <span
                              className="rounded-circle flex-shrink-0"
                              style={{
                                width: 8,
                                height: 8,
                                background:
                                  CATEGORY_COLORS[a.category] || colors.muted,
                                border:
                                  a.category === "Dairy"
                                    ? `1px solid ${colors.border}`
                                    : "none",
                              }}
                            />

                            <div style={{ minWidth: 0 }}>
                              <div
                                className="small fw-semibold text-truncate"
                                style={{ color: colors.charcoal }}
                              >
                                {a.title}
                              </div>

                              <div
                                className="d-flex align-items-center gap-1"
                                style={{
                                  fontSize: "0.72rem",
                                  color: colors.muted,
                                  marginTop: "0.1rem",
                                }}
                              >
                                <Clock size={11} />
                                {formatActivityTime(a.timestamp)}
                              </div>
                            </div>
                          </div>

                          <span
                            className="flex-shrink-0"
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              backgroundColor: config.bg,
                              color: config.color,
                              padding: "0.2rem 0.55rem",
                              borderRadius: "999px",
                              textTransform: "uppercase",
                              letterSpacing: "0.3px",
                            }}
                          >
                            {config.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
