import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { colors, fonts } from '../../../theme';
import SuggestedMeals from '../SuggestedMeals';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];
const STORAGE_KEY = 'zw_meal_planner';

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
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
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function dayKey(date) {
  return date.toISOString().split('T')[0];
}

function loadMeals() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function saveMeals(meals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
}

const DAY_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function MealPlanner() {
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [meals, setMeals] = useState(loadMeals);
  const [editing, setEditing] = useState(null); // { key, meal, value }

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const monthStart = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(1);
    return d;
  }, [weekStart]);

  const monthDays = useMemo(() => {
    const days = [];
    const start = new Date(monthStart);
    const endDate = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    // pad to Monday
    const firstDay = start.getDay() === 0 ? 6 : start.getDay() - 1;
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= endDate.getDate(); d++) {
      days.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
    }
    return days;
  }, [monthStart]);

  const shownMonthYear = viewMode === 'week'
    ? formatMonthYear(weekStart)
    : formatMonthYear(monthStart);

  const navPrev = () => {
    if (viewMode === 'week') setWeekStart(d => addDays(d, -7));
    else setWeekStart(d => { const nd = new Date(d); nd.setMonth(nd.getMonth() - 1); return getWeekStart(nd); });
  };
  const navNext = () => {
    if (viewMode === 'week') setWeekStart(d => addDays(d, 7));
    else setWeekStart(d => { const nd = new Date(d); nd.setMonth(nd.getMonth() + 1); return getWeekStart(nd); });
  };

  const getMeal = (date, meal) => {
    const k = `${dayKey(date)}_${meal}`;
    return meals[k] || '';
  };

  const startEdit = (date, meal) => {
    const k = `${dayKey(date)}_${meal}`;
    setEditing({ key: k, value: meals[k] || '' });
  };

  const commitEdit = () => {
    if (!editing) return;
    const updated = { ...meals, [editing.key]: editing.value };
    setMeals(updated);
    saveMeals(updated);
    setEditing(null);
  };

  const today = dayKey(new Date());

  const cellBorder = `1px solid ${colors.border}`;

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 style={{ fontFamily: fonts.display, fontSize: '1.75rem', fontWeight: 700, color: colors.charcoal, marginBottom: '0.25rem' }}>
          Meal Planner
        </h1>
        <p className="mb-0" style={{ color: colors.muted }}>
          Create smarter meal plans based on your food inventory.
        </p>
      </div>

      <SuggestedMeals />

      {/* Controls row */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center justify-content-center"
            onClick={navPrev}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${colors.border}`, background: 'white', padding: 0 }}
          >
            <ChevronLeft size={16} color={colors.charcoal} />
          </button>

          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: colors.charcoal, minWidth: 130, textAlign: 'center' }}>
            {shownMonthYear}
          </span>

          <button
            type="button"
            className="btn btn-sm d-flex align-items-center justify-content-center"
            onClick={navNext}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${colors.border}`, background: 'white', padding: 0 }}
          >
            <ChevronRight size={16} color={colors.charcoal} />
          </button>
        </div>

        {/* Week / Month toggle */}
        <div
          className="d-flex"
          style={{ border: `1.5px solid ${colors.border}`, borderRadius: 10, overflow: 'hidden', background: 'white' }}
        >
          {['week', 'month'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              style={{
                padding: '0.4rem 1.1rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: 'none',
                background: viewMode === mode ? colors.charcoal : 'transparent',
                color: viewMode === mode ? 'white' : colors.muted,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'background 0.15s',
              }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar card */}
      <div
        className="bg-white rounded-4 overflow-hidden"
        style={{ border: `1.5px solid ${colors.border}` }}
      >
        {viewMode === 'week' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr style={{ background: colors.cream }}>
                  {/* meal label col */}
                  <th style={{ width: 90, borderBottom: cellBorder, borderRight: cellBorder }} />
                  {weekDays.map((d, i) => {
                    const isToday = dayKey(d) === today;
                    return (
                      <th key={i} style={{ borderBottom: cellBorder, borderRight: i < 6 ? cellBorder : 'none', padding: '12px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.07em', color: colors.muted, textTransform: 'uppercase' }}>
                          {DAY_SHORT[i]}
                        </div>
                        <div style={{
                          marginTop: 4,
                          width: 30, height: 30,
                          borderRadius: '50%',
                          background: isToday ? colors.green : 'transparent',
                          color: isToday ? 'white' : colors.charcoal,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.875rem', fontWeight: 700,
                        }}>
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
                    <td style={{
                      borderBottom: mi < 2 ? cellBorder : 'none',
                      borderRight: cellBorder,
                      padding: '0 14px',
                      verticalAlign: 'middle',
                      width: 90,
                    }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.muted }}>{meal}</span>
                    </td>
                    {weekDays.map((d, di) => {
                      const k = `${dayKey(d)}_${meal}`;
                      const val = getMeal(d, meal);
                      const isEditingThis = editing?.key === k;
                      return (
                        <td
                          key={di}
                          style={{
                            borderBottom: mi < 2 ? cellBorder : 'none',
                            borderRight: di < 6 ? cellBorder : 'none',
                            padding: '10px 10px',
                            verticalAlign: 'top',
                            minHeight: 90,
                            height: 90,
                            cursor: 'pointer',
                            background: isEditingThis ? '#f0faf4' : 'transparent',
                          }}
                          onClick={() => !isEditingThis && startEdit(d, meal)}
                        >
                          {isEditingThis ? (
                            <textarea
                              autoFocus
                              value={editing.value}
                              onChange={(e) => setEditing(prev => ({ ...prev, value: e.target.value }))}
                              onBlur={commitEdit}
                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); } if (e.key === 'Escape') setEditing(null); }}
                              style={{
                                width: '100%', height: 70, border: 'none', background: 'transparent',
                                resize: 'none', fontSize: '0.8rem', color: colors.charcoal, outline: 'none',
                                fontFamily: 'inherit', padding: 0,
                              }}
                              placeholder="Add meal…"
                            />
                          ) : (
                            <>
                              {val ? (
                                <span style={{ fontSize: '0.8rem', color: colors.charcoal, display: 'block', lineHeight: 1.4 }}>{val}</span>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#d1d5db' }}>+ Add meal</span>
                              )}
                              {val && (
                                <div style={{ marginTop: 8, height: 2, width: '60%', background: colors.border, borderRadius: 2 }} />
                              )}
                            </>
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
          /* Month view */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ background: colors.cream }}>
                  {DAY_SHORT.map((d, i) => (
                    <th key={d} style={{
                      borderBottom: cellBorder,
                      borderRight: i < 6 ? cellBorder : 'none',
                      padding: '10px 0',
                      textAlign: 'center',
                      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.07em', color: colors.muted, textTransform: 'uppercase'
                    }}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.ceil(monthDays.length / 7) }, (_, wi) => (
                  <tr key={wi}>
                    {monthDays.slice(wi * 7, wi * 7 + 7).map((d, di) => {
                      const isToday = d && dayKey(d) === today;
                      const inMonth = d && d.getMonth() === monthStart.getMonth();
                      const mealsForDay = d ? MEAL_TYPES.map(m => getMeal(d, m)).filter(Boolean) : [];
                      return (
                        <td key={di} style={{
                          borderBottom: wi < Math.ceil(monthDays.length / 7) - 1 ? cellBorder : 'none',
                          borderRight: di < 6 ? cellBorder : 'none',
                          padding: '8px 8px',
                          verticalAlign: 'top',
                          minHeight: 90, height: 90,
                          background: !inMonth ? colors.cream : 'white',
                        }}>
                          {d && (
                            <>
                              <div style={{
                                width: 26, height: 26, borderRadius: '50%',
                                background: isToday ? colors.green : 'transparent',
                                color: isToday ? 'white' : inMonth ? colors.charcoal : colors.border,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.8rem', fontWeight: isToday ? 700 : 500,
                                marginBottom: 4,
                              }}>
                                {d.getDate()}
                              </div>
                              {mealsForDay.slice(0, 2).map((m, mi) => (
                                <div key={mi} style={{
                                  fontSize: '0.7rem', color: colors.greenD, background: '#eaf5ef',
                                  borderRadius: 4, padding: '1px 5px', marginBottom: 2,
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                  {m}
                                </div>
                              ))}
                              {mealsForDay.length > 2 && (
                                <div style={{ fontSize: '0.68rem', color: colors.muted }}>+{mealsForDay.length - 2} more</div>
                              )}
                            </>
                          )}
                        </td>
                      );
                    })}
                    {/* fill remaining cells in last row */}
                    {monthDays.slice(wi * 7, wi * 7 + 7).length < 7 &&
                      Array.from({ length: 7 - monthDays.slice(wi * 7, wi * 7 + 7).length }, (_, fi) => (
                        <td key={`fill-${fi}`} style={{ borderLeft: cellBorder, background: colors.cream }} />
                      ))
                    }
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-2" style={{ fontSize: '0.78rem', color: colors.muted }}>
        Click any cell to add or edit a meal. Press Enter or click away to save.
      </p>
    </div>
  );
}