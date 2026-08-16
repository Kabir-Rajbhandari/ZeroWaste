import { useEffect, useState } from "react";
import { Leaf, HeartHandshake, Recycle, Download } from "lucide-react";
import { btnPrimaryStyle, colors, fonts, shadows } from "../../../theme";
import { analyticsApi } from "../../../services/api";
import DateRangePicker, { toISODate } from "../DateRangePicker";
import { useCountUp } from "../../../utils/useCountUp";

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

  // Precompute each segment's dash offset in one pure pass instead of
  // mutating a `cumulative` variable inside the JSX .map() below — mutating
  // a render-scoped variable as a side effect of rendering is what triggers
  // "Cannot reassign variable after render completes".
  const segments = data.reduce((acc, d) => {
    if (d.percent <= 0) return acc;
    const prevCumulative =
      acc.length > 0 ? acc[acc.length - 1].cumulativeEnd : 0;
    const cumulativeEnd = prevCumulative + (d.percent / 100) * circumference;
    acc.push({ ...d, dashoffset: -prevCumulative, cumulativeEnd });
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
                            stroke-width 0.15s, stroke-opacity 0.15s`,
            }}
            onClick={() => onSelectCategory?.(d.category)}
          >
            <title>{`${CATEGORY_LABELS[d.category] || d.category}: ${d.percent}% (click to filter)`}</title>
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
                transition: `height 1s cubic-bezier(0.34, 1.56, 0.64, 1) ${animationDelay + idx * 100}ms, opacity 0.15s`,
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
        e.currentTarget.style.transform = "translateY(-8px)";
        e.currentTarget.style.boxShadow = `0 12px 24px ${colors.greenLrgb}`;
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
          style={{ transition: "transform 0.3s ease" }}
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
  const [period, setPeriod] = useState("month");
  const [category, setCategory] = useState("All");
  const [customRange, setCustomRange] = useState({ start: null, end: null });
  const [summary, setSummary] = useState(null);
  const [inventoryOverview, setInventoryOverview] = useState(null);
  const [foodSavedBreakdown, setFoodSavedBreakdown] = useState(null);
  const [wasteBreakdown, setWasteBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [isCategoryHovered, setIsCategoryHovered] = useState(false);

  const rangeParam =
    period === "custom" && customRange.start && customRange.end
      ? {
          startDate: toISODate(customRange.start),
          endDate: toISODate(customRange.end),
        }
      : null;

  // Derived, not effect-synced: whether we're waiting on the user to finish
  // picking a custom range is fully computable from `period`/`rangeParam`
  // every render, so it doesn't need its own setState — computing it here
  // avoids a synchronous setState(false)-then-return inside the effect below.
  const awaitingCustomRange = period === "custom" && !rangeParam;

  useEffect(() => {
    if (awaitingCustomRange) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrMsg("");
      try {
        const [summaryData, inventoryData, savedData, wasteData] =
          await Promise.all([
            analyticsApi.getSummary(period, category, rangeParam),
            // FIX: Pass ONLY 'category' to query current active inventory stock correctly
            analyticsApi.getInventoryOverview(category),
            analyticsApi.getFoodSavedBreakdown(period, category, rangeParam),
            analyticsApi.getWasteBreakdown(period, category, rangeParam),
          ]);
        if (cancelled) return;
        setSummary(summaryData);
        setInventoryOverview(inventoryData);
        setFoodSavedBreakdown(savedData);
        setWasteBreakdown(wasteData);
      } catch (err) {
        if (!cancelled) setErrMsg(err.message || "Failed to load analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
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

  const handleSelectCategory = (clicked) => {
    setCategory((current) => (current === clicked ? "All" : clicked));
  };

  const handleExport = () => {
    window.print();
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
          body * { visibility: hidden; }
          #analytics-print-area, #analytics-print-area * { visibility: visible; }
          #analytics-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px;
          }
          #analytics-export-controls { display: none !important; }
        }

        .btn-export-report {
          opacity: 0.75;
          transition: opacity 0.2s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease; 
        }

        .btn-export-report:hover:not(:disabled) {
          opacity: 1;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
        }

        .analytics-chart-container {
          animation: slideInUp 0.6s ease-out backwards;
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
      `}</style>

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
          {period === "custom" && customRange.start && customRange.end && (
            <p
              className="mb-0 mt-1 small d-flex align-items-center gap-2"
              style={{ color: colors.green, fontWeight: 600 }}
            >
              {customRange.start.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}{" "}
              –{" "}
              {customRange.end.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
              <button
                type="button"
                onClick={() => {
                  setCustomRange({ start: null, end: null });
                  setPeriod("month");
                }}
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  color: colors.muted,
                  textDecoration: "underline",
                  fontSize: "1.1rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                clear
              </button>
            </p>
          )}
          {category !== "All" && (
            <p
              className="mb-0 mt-1 small d-flex align-items-center gap-2"
              style={{ color: colors.green, fontWeight: 600 }}
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
                  textDecoration: "underline",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                clear
              </button>
            </p>
          )}
        </div>

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
              setCustomRange({ start: null, end: null });
              setPeriod("month");
            }}
          />

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
            <Download size={16} /> Export Report
          </button>
        </div>
      </div>

      {errMsg && (
        <div className="alert alert-danger py-2 small mb-3">{errMsg}</div>
      )}

      {awaitingCustomRange ? (
        <div className="text-center py-5" style={{ color: colors.muted }}>
          Pick a start and end date to view analytics for your custom range.
        </div>
      ) : loading ? (
        <div className="text-center py-5" style={{ color: colors.muted }}>
          Loading analytics…
        </div>
      ) : !summary?.foodSavedCount && !summary?.donationsMadeCount ? (
        // UC4 – Food Analytics, Alternative Course 3a: "If no food-saving
        // data is found, system shows a message encouraging the user to
        // begin logging and donating to view progress."
        <div
          className="text-center py-5 rounded-4"
          style={{
            background: colors.authGreen,
            border: `2px dashed ${colors.greenLrgb}`,
            color: colors.charcoal,
          }}
        >
          <Leaf size={40} style={{ opacity: 0.6, marginBottom: "0.75rem" }} />
          <h5 style={{ fontFamily: fonts.body, fontWeight: 700 }}>
            No food-saving data yet
          </h5>
          <p style={{ color: colors.muted, marginBottom: 0 }}>
            Start logging items in your Food Inventory and marking them as used
            or donated to see your impact here.
          </p>
        </div>
      ) : (
        <>
          <div className="d-flex flex-wrap gap-3 mb-4">
            <StatCard
              icon={Leaf}
              label="Food Saved"
              value={summary?.foodSavedCount ?? 0}
              sublabel={`items marked used ${period === "custom" ? "in range" : `this ${period}`}`}
              delay={0}
            />
            <StatCard
              icon={HeartHandshake}
              label="Donations Made"
              value={summary?.donationsMadeCount ?? 0}
              sublabel={`donations ${period === "custom" ? "in range" : `this ${period}`}`}
              delay={100}
            />
            <StatCard
              icon={Recycle}
              label="Waste Reduced"
              value={`${summary?.wasteReducedPercent ?? 0}%`}
              sublabel={`of items saved or donated ${period === "custom" ? "in range" : `this ${period}`}`}
              delay={200}
            />
          </div>

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
                <h6 className="fw-bold mb-3" style={{ color: colors.charcoal }}>
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
                  style={{ color: colors.muted }}
                >
                  Total Items:{" "}
                  <span className="fw-bold" style={{ color: colors.charcoal }}>
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
                <h6 className="fw-bold mb-3" style={{ color: colors.charcoal }}>
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
                  style={{ color: colors.muted }}
                >
                  Total Items:{" "}
                  <span className="fw-bold" style={{ color: colors.charcoal }}>
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
                <h6 className="fw-bold mb-3" style={{ color: colors.charcoal }}>
                  Waste by Category
                </h6>
                <p
                  className="small mb-3"
                  style={{ color: colors.muted, marginTop: "-0.5rem" }}
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
                  style={{ color: colors.muted }}
                >
                  Total Items:{" "}
                  <span className="fw-bold" style={{ color: colors.charcoal }}>
                    {wasteBreakdown?.totalItems ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
