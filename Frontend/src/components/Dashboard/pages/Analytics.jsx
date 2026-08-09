import { useEffect, useState } from "react";
import { Leaf, HeartHandshake, Recycle, Download } from "lucide-react";
import { colors, fonts } from "../../../theme";
import { analyticsApi } from "../../../services/api";

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

function DonutChart({ data, size = 170, strokeWidth = 30 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="flex-shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#DEE5D4"
        strokeWidth={strokeWidth}
      />
      {data.map((d) => {
        if (d.percent <= 0) return null;
        const length = (d.percent / 100) * circumference;
        const dasharray = `${length} ${circumference - length}`;
        const dashoffset = -cumulative;
        cumulative += length;
        return (
          <circle
            key={d.category}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={CATEGORY_COLORS[d.category] || colors.muted}
            strokeWidth={strokeWidth}
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
    </svg>
  );
}

function BarChart({ data, height = 170 }) {
  const max = Math.max(...data.map((d) => d.percent), 1);
  return (
    <div
      className="d-flex align-items-end gap-4 flex-shrink-0"
      style={{ height }}
    >
      {data.map((d) => (
        <div
          key={d.category}
          className="d-flex flex-column align-items-center justify-content-end h-100"
          style={{ width: 36 }}
        >
          <div
            style={{
              width: 30,
              height:
                d.percent > 0
                  ? `${Math.max((d.percent / max) * (height - 24), 6)}px`
                  : "2px",
              background: CATEGORY_COLORS[d.category] || colors.muted,
              borderRadius: "6px 6px 2px 2px",
              transition: "height 0.3s",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function Legend({ data }) {
  return (
    <div
      className="d-flex flex-column gap-2 flex-grow-1"
      style={{ minWidth: 140 }}
    >
      {data.map((d) => (
        <div key={d.category} className="d-flex align-items-center gap-2">
          <span
            className="rounded-circle flex-shrink-0"
            style={{
              width: 10,
              height: 10,
              background: CATEGORY_COLORS[d.category] || colors.muted,
              border:
                d.category === "Dairy" ? `1px solid ${colors.border}` : "none",
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
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sublabel }) {
  return (
    <div
      className="rounded-4 p-4 flex-grow-1"
      style={{
        background: colors.authGreen,
        border: `2px solid ${colors.greenLrgb}`,
        minWidth: 220,
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
          }}
        >
          {value}
        </span>
        <Icon size={30} color={colors.authGreen} />
      </div>
      {sublabel && (
        <div className="small mt-2" style={{ color: colors.muted }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

export default function Analytics() {
  const [period, setPeriod] = useState("month");
  const [summary, setSummary] = useState(null);
  const [inventoryOverview, setInventoryOverview] = useState(null);
  const [foodSavedBreakdown, setFoodSavedBreakdown] = useState(null);
  const [wasteBreakdown, setWasteBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrMsg("");
      try {
        const [summaryData, inventoryData, savedData, wasteData] =
          await Promise.all([
            analyticsApi.getSummary(period),
            analyticsApi.getInventoryOverview(),
            analyticsApi.getFoodSavedBreakdown(period),
            analyticsApi.getWasteBreakdown(period),
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
  }, [period]);

  const handleExport = () => {
    window.print();
  };

  return (
    <div id="analytics-print-area">
      {/* Printing this page (via Export Report) hides everything else — the
          sidebar, header, and the period/export controls themselves — and
          only renders the analytics content, so "Save as PDF" in the
          browser's print dialog produces a clean report. */}
      <style>{`
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
        </div>

        <div
          id="analytics-export-controls"
          className="d-flex align-items-center gap-2 flex-wrap"
        >
          <div
            className="d-flex"
            style={{
              border: `2px solid ${colors.greenL}`,
              borderRadius: 6,
              overflow: "hidden",
              background: "white",
            }}
          >
            {["month", "year"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                style={{
                  padding: "0.5rem 1.1rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  border: "none",
                  background: period === p ? colors.green : "transparent",
                  color: period === p ? "#fff" : colors.muted,
                  cursor: "pointer",
                }}
              >
                This {p === "month" ? "Month" : "Year"}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn d-inline-flex align-items-center gap-2 outline-export"
            style={{
              opacity: 0.75,
              border: `2px solid ${colors.green}`,
              color: colors.charcoal,
              padding: "0.50rem 1rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              borderRadius: 6,
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

      {loading ? (
        <div className="text-center py-5" style={{ color: colors.muted }}>
          Loading analytics…
        </div>
      ) : (
        <>
          <div className="d-flex flex-wrap gap-3 mb-4">
            <StatCard
              icon={Leaf}
              label="Food Saved"
              value={summary?.foodSavedCount ?? 0}
              sublabel={`items marked used this ${period}`}
            />
            <StatCard
              icon={HeartHandshake}
              label="Donations Made"
              value={summary?.donationsMadeCount ?? 0}
              sublabel={`donations this ${period}`}
            />
            <StatCard
              icon={Recycle}
              label="Waste Reduced"
              value={`${summary?.wasteReducedPercent ?? 0}%`}
              sublabel={`of items saved or donated this ${period}`}
            />
          </div>

          <div className="row g-4">
            <div className="col-12 col-lg-4">
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
                  <DonutChart data={inventoryOverview?.breakdown || []} />
                  <Legend data={inventoryOverview?.breakdown || []} />
                </div>
                <div
                  className="text-end mt-3 small"
                  style={{ color: colors.muted }}
                >
                  Total Items:{" "}
                  <span className="fw-bold" style={{ color: colors.authGreen }}>
                    {inventoryOverview?.totalItems ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-4">
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
                  <BarChart data={foodSavedBreakdown?.breakdown || []} />
                  <Legend data={foodSavedBreakdown?.breakdown || []} />
                </div>
                <div
                  className="text-end mt-3 small"
                  style={{ color: colors.muted }}
                >
                  Total Items:{" "}
                  <span className="fw-bold" style={{ color: colors.authGreen }}>
                    {foodSavedBreakdown?.totalItems ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-4">
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
                  <DonutChart data={wasteBreakdown?.breakdown || []} />
                  <Legend data={wasteBreakdown?.breakdown || []} />
                </div>
                <div
                  className="text-end mt-3 small"
                  style={{ color: colors.muted }}
                >
                  Total Items:{" "}
                  <span className="fw-bold" style={{ color: colors.authGreen }}>
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
