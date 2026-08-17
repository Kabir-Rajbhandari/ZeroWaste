import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { colors, fonts, shadows } from "../../theme";

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatShort(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const first = new Date(year, month, 1);

  // Monday = 0
  const firstWeekday = first.getDay() === 0 ? 6 : first.getDay() - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push(null);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

const PRESETS = [
  {
    label: "Today",
    range: () => {
      const now = new Date();

      return [startOfDay(now), startOfDay(now)];
    },
  },

  {
    label: "Yesterday",
    range: () => {
      const yesterday = addDays(new Date(), -1);

      return [startOfDay(yesterday), startOfDay(yesterday)];
    },
  },

  {
    label: "Last 7 days",
    range: () => {
      const now = new Date();

      return [startOfDay(addDays(now, -6)), startOfDay(now)];
    },
  },

  {
    label: "Last 30 days",
    range: () => {
      const now = new Date();

      return [startOfDay(addDays(now, -29)), startOfDay(now)];
    },
  },

  {
    label: "This month",
    range: () => {
      const now = new Date();

      const start = new Date(now.getFullYear(), now.getMonth(), 1);

      return [startOfDay(start), startOfDay(now)];
    },
  },

  {
    label: "Last month",
    range: () => {
      const now = new Date();

      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const end = new Date(now.getFullYear(), now.getMonth(), 0);

      return [startOfDay(start), startOfDay(end)];
    },
  },

  {
    /*
     * Year-to-date.
     *
     * Example:
     * 17 Aug 2026
     * =>
     * 01 Jan 2026 – 17 Aug 2026
     */
    label: "This year",
    range: () => {
      const now = new Date();

      const start = new Date(now.getFullYear(), 0, 1);

      return [startOfDay(start), startOfDay(now)];
    },
  },
];

export default function DateRangePicker({ value, onChange, onClear }) {
  const [open, setOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  /*
   * These are temporary selections inside
   * the calendar.
   *
   * They are initialized from the parent value
   * once when the component mounts.
   *
   * We do NOT synchronize them through an effect,
   * because that caused the React cascading-render
   * warning.
   */
  const [pendingStart, setPendingStart] = useState(() => value?.start || null);

  const [pendingEnd, setPendingEnd] = useState(() => value?.end || null);

  const [visibleMonth, setVisibleMonth] = useState(
    () => value?.start || startOfDay(new Date()),
  );

  const containerRef = useRef(null);

  /*
   * Close the picker when clicking outside.
   *
   * This is safe because setOpen() happens inside
   * the actual DOM event callback.
   */
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const monthCells = useMemo(
    () => buildMonthGrid(visibleMonth),
    [visibleMonth],
  );

  const triggerLabel =
    value?.start && value?.end
      ? `${formatShort(value.start)} – ${formatShort(value.end)}`
      : "Select Date";

  /*
   * Manual calendar date selection.
   */
  const handleDayClick = (day) => {
    if (!day) return;

    const clicked = startOfDay(day);

    /*
     * Start a new range when:
     * - there is no start date yet
     * - previous range is already complete
     */
    if (!pendingStart || pendingEnd) {
      setPendingStart(clicked);
      setPendingEnd(null);
      return;
    }

    let start;
    let end;

    /*
     * If second date is before first date,
     * automatically reverse them.
     */
    if (clicked < pendingStart) {
      start = clicked;
      end = pendingStart;
    } else {
      start = pendingStart;
      end = clicked;
    }

    setPendingStart(start);
    setPendingEnd(end);

    /*
     * Send completed range to parent.
     */
    onChange?.({
      start,
      end,
    });

    setOpen(false);
  };

  /*
   * Preset selection.
   */
  const handlePreset = (preset) => {
    const [start, end] = preset.range();

    setPendingStart(start);
    setPendingEnd(end);

    /*
     * Show the month containing the
     * selected starting date.
     */
    setVisibleMonth(new Date(start.getFullYear(), start.getMonth(), 1));

    /*
     * Send the selected range to parent.
     */
    onChange?.({
      start,
      end,
    });

    setOpen(false);
  };

  /*
   * Reset.
   */
  const handleReset = () => {
    setPendingStart(null);
    setPendingEnd(null);

    setVisibleMonth(startOfDay(new Date()));

    onClear?.();

    setOpen(false);
  };

  /*
   * Check whether the calendar day
   * falls inside the selected range.
   */
  const isInRange = (day) => {
    if (!day || !pendingStart) {
      return false;
    }

    const d = startOfDay(day).getTime();

    const s = pendingStart.getTime();

    const e = (pendingEnd || pendingStart).getTime();

    return d >= Math.min(s, e) && d <= Math.max(s, e);
  };

  /*
   * Check whether the day is the
   * start or end of the range.
   */
  const isEndpoint = (day) => {
    if (!day) {
      return false;
    }

    const d = startOfDay(day).getTime();

    return (
      (pendingStart && d === pendingStart.getTime()) ||
      (pendingEnd && d === pendingEnd.getTime())
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "inline-block",
      }}
    >
      <button
        id="btn-date-picker"
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          opacity: isHovered ? 1 : 0.8,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          border: `2px solid ${colors.green}`,
          borderRadius: 6,
          background: "white",
          color: colors.charcoal,
          fontSize: "0.85rem",
          fontWeight: 600,
          padding: "0.5rem 0.85rem",
          cursor: "pointer",
          boxShadow: isHovered ? shadows.md : "none",
          transition: "opacity 0.2s ease, box-shadow 0.25s ease",
        }}
      >
        <CalendarDays size={15} color={colors.black} />

        {triggerLabel}
      </button>

      {open && (
        <div
          role="dialog"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 40,
            background: "white",
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            display: "flex",
            minWidth: 460,
            overflow: "hidden",
            fontFamily: fonts.body,
          }}
        >
          {/* Presets */}
          <div
            style={{
              width: 150,
              flexShrink: 0,
              borderRight: `1px solid ${colors.border}`,
              padding: "0.75rem 0",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePreset(preset)}
                style={{
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  padding: "0.5rem 1rem",
                  fontSize: "0.85rem",
                  color: colors.charcoal,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.authGreen;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {preset.label}
              </button>
            ))}

            <div style={{ flex: 1 }} />

            <button
              type="button"
              onClick={handleReset}
              style={{
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: "0.5rem 1rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: colors.green,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.authGreen;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              Reset
            </button>
          </div>

          {/* Calendar */}
          <div
            style={{
              padding: "0.75rem 1rem",
              flex: 1,
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: colors.charcoal,
                }}
              >
                {visibleMonth.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>

              <div className="d-flex gap-1">
                {/* Previous month */}
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() =>
                    setVisibleMonth(
                      (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1),
                    )
                  }
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  <ChevronLeft size={16} color={colors.muted} />
                </button>

                {/* Next month */}
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() =>
                    setVisibleMonth(
                      (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1),
                    )
                  }
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  <ChevronRight size={16} color={colors.muted} />
                </button>
              </div>
            </div>

            {/* Weekday headings */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 2,
                marginBottom: 4,
              }}
            >
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((dayName) => (
                <div
                  key={dayName}
                  style={{
                    textAlign: "center",
                    fontSize: "0.7rem",
                    color: colors.muted,
                    fontWeight: 600,
                  }}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 2,
              }}
            >
              {monthCells.map((day, i) => {
                const inRange = isInRange(day);

                const endpoint = isEndpoint(day);

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!day}
                    onClick={() => handleDayClick(day)}
                    style={{
                      height: 30,
                      border: "none",
                      borderRadius: endpoint ? "50%" : 6,
                      background: endpoint
                        ? colors.green
                        : inRange
                          ? colors.greenLrgb
                          : "transparent",
                      color: !day
                        ? "transparent"
                        : endpoint
                          ? "white"
                          : colors.charcoal,
                      fontSize: "0.8rem",
                      fontWeight: endpoint ? 700 : 400,
                      cursor: day ? "pointer" : "default",
                    }}
                  >
                    {day ? day.getDate() : ""}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { toISODate };
