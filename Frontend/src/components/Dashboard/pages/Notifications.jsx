// src/components/Dashboard/pages/Notifications.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronsRight, ChevronsLeft, Check } from "lucide-react";
import { colors, fonts, btnPrimaryStyle } from "../../../theme";
import { notificationApi } from "../../../services/api";

const TABS = ["All", "Alerts", "Donations", "Reminders", "System"];
const PAGE_SIZE = 8;

function timeAgo(isoString) {
  if (!isoString) return "";

  const then = new Date(isoString).getTime();
  const diffMs = Date.now() - then;

  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "Just now";

  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Notifications({ onUnreadCountChange, onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [activeFilter, setActiveFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [actioningId, setActioningId] = useState(null);
  const [actionErr, setActionErr] = useState("");

  /*
   * Load notifications.
   *
   * This function is reused for:
   * 1. Initial notification loading
   * 2. Refreshing notifications after Accept / Decline
   *
   * We intentionally do not set loading=true here.
   * The component starts with loading=true for the initial request.
   * This avoids unnecessary synchronous state updates from useEffect.
   */
  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationApi.getAll();

      const list = Array.isArray(data)
        ? [...data].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
        : [];

      setNotifications(list);
      setErrMsg("");
    } catch (err) {
      setErrMsg(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  /*
   * Initial notification loading.
   */
  useEffect(() => {
    let cancelled = false;

    const loadInitialNotifications = async () => {
      if (cancelled) return;

      await loadNotifications();
    };

    void loadInitialNotifications();

    return () => {
      cancelled = true;
    };
  }, [loadNotifications]);

  /*
   * Keep unread count synchronized with notifications.
   */
  useEffect(() => {
    const unreadCount = notifications.filter(
      (notification) => !notification.read,
    ).length;

    onUnreadCountChange?.(unreadCount);
  }, [notifications, onUnreadCountChange]);

  /*
   * Filter notifications.
   */
  const filtered = useMemo(() => {
    if (activeFilter === "All") {
      return notifications;
    }

    return notifications.filter(
      (notification) => notification.category === activeFilter,
    );
  }, [notifications, activeFilter]);

  /*
   * Pagination.
   */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const paginatedNotifications = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /*
   * Handle notification click.
   *   */
  const handleNotificationClick = async (notification) => {
    setActionErr("");

    if (!notification.read) {
      try {
        await notificationApi.markRead(notification.id);

        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        );
      } catch (err) {
        setActionErr(err.message || "Failed to mark notification as read.");
      }
    }

    /*
     * Expiry notifications should always navigate
     * to the user's Food Inventory.

     */
    if (notification.type === "EXPIRY_ALERT") {
      if (onNavigate) {
        onNavigate("inventory", notification);
      }

      return;
    }

    /*
     * Other notifications can provide their own destination
     * if available.
     */
    const destination =
      notification.route || notification.path || notification.link;

    if (destination && onNavigate) {
      onNavigate(destination, notification);
    }
  };

  /*
   * Mark a single notification as read, without navigating anywhere
   * (unlike clicking the card itself, which also marks it read but then
   * follows the notification's destination).
   */
  const handleMarkOneRead = async (id) => {
    setActionErr("");

    try {
      await notificationApi.markRead(id);

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, read: true }
            : notification,
        ),
      );
    } catch (err) {
      setActionErr(err.message || "Failed to mark notification as read.");
    }
  };

  /*
   * Mark all notifications as read.
   */
  const handleMarkAllRead = async () => {
    setActionErr("");

    try {
      await notificationApi.markAllRead();

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read: true,
        })),
      );
    } catch (err) {
      setErrMsg(err.message || "Failed to mark notifications as read.");
    }
  };

  /*
   * Accept donation claim request.
   *
   * After the backend processes the request,
   * reload notifications using loadNotifications().
   */
  const handleAccept = async (id) => {
    setActioningId(id);
    setActionErr("");

    try {
      await notificationApi.accept(id);
      await loadNotifications();
    } catch (err) {
      setActionErr(err.message || "Failed to accept this request.");
    } finally {
      setActioningId(null);
    }
  };

  /*
   * Decline donation claim request.
   *
   * After the backend processes the request,
   * reload notifications using loadNotifications().
   */
  const handleDecline = async (id) => {
    setActioningId(id);
    setActionErr("");

    try {
      await notificationApi.decline(id);
      await loadNotifications();
    } catch (err) {
      setActionErr(err.message || "Failed to decline this request.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div>
      <style>
        {`
          .mark-btn {
            opacity: 0.75;
            transition:
              opacity 0.2s ease,
              background 0.25s ease,
              transform 0.25s ease,
              box-shadow 0.25s ease;
          }

          .mark-btn:hover:not(:disabled) {
            opacity: 1;
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
          }

          .accept-btn {
            opacity: 0.75;
            transition:
              opacity 0.2s ease,
              background 0.25s ease,
              transform 0.25s ease,
              box-shadow 0.25s ease;
          }

          .accept-btn:hover:not(:disabled) {
            opacity: 1;
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
          }

          .notification-card {
            cursor: pointer;
            transition:
              transform 0.2s ease,
              box-shadow 0.2s ease;
          }

          .notification-card:hover {
            transform: translateY(-1px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          }
        `}
      </style>

      {/* Header */}
      <div className="mb-4">
        <h1
          style={{
            fontFamily: fonts.body,
            fontSize: "1.60rem",
            fontWeight: 700,
            color: colors.charcoal,
            marginBottom: "0.25rem",
            opacity: 0.75,
          }}
        >
          Notification
        </h1>

        <p className="mb-0" style={{ color: colors.muted }}>
          Real-time updates about your donations, expiry alerts, and account
          activity.
        </p>
      </div>

      {/* Filters + Mark All */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const isActive = activeFilter === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveFilter(tab);
                  setPage(1);
                }}
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
                {tab}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="btn btn-sm mark-btn"
          style={{
            ...btnPrimaryStyle,
            borderRadius: 4,
            fontWeight: 600,
            padding: "0.45rem 1.15rem",
            fontSize: "0.9rem",
            color: colors.white,
            transition: "all 0.5s ease",
          }}
          onClick={handleMarkAllRead}
        >
          Mark all as read
        </button>
      </div>

      {/* Errors */}
      {errMsg && <div className="alert alert-danger py-2 small">{errMsg}</div>}

      {actionErr && (
        <div className="alert alert-danger py-2 small">{actionErr}</div>
      )}

      {/* Notifications */}
      <div className="d-flex flex-column gap-2">
        {loading ? (
          <div className="text-center py-5" style={{ color: colors.muted }}>
            Loading notifications…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-5" style={{ color: colors.muted }}>
            No notifications here yet.
          </div>
        ) : (
          paginatedNotifications.map((notification) => {
            const isActionable =
              notification.claimRequestId && !notification.resolved;

            return (
              <div
                key={notification.id}
                className="notification-card d-flex align-items-start justify-content-between gap-3 rounded-2 p-3"
                role="button"
                tabIndex={0}
                onClick={() => handleNotificationClick(notification)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleNotificationClick(notification);
                  }
                }}
                style={{
                  background: notification.read
                    ? colors.authBg
                    : colors.showcase_green,

                  border: `1px solid ${colors.greenLrgb}`,

                  boxShadow: notification.read
                    ? "none"
                    : `0 2px 8px ${colors.greenLrgb}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  {/* Title */}
                  <div className="fw-bold" style={{ color: colors.charcoal }}>
                    {notification.title}
                  </div>

                  {/* Message */}
                  <div className="small" style={{ color: colors.muted }}>
                    {notification.message}
                  </div>

                  {/* Accept / Decline */}
                  {isActionable && (
                    <div
                      className="d-flex align-items-center gap-2 mt-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="btn btn-sm accept-btn"
                        style={{
                          ...btnPrimaryStyle,
                          border: "none",
                          borderRadius: 4,
                          padding: "0.25rem 1rem",
                          fontSize: "0.9rem",
                          color: colors.white,
                          transition: "all 0.5s ease",
                        }}
                        disabled={actioningId === notification.id}
                        onClick={() => handleAccept(notification.id)}
                      >
                        {actioningId === notification.id
                          ? "Processing..."
                          : "Accept"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          borderRadius: 4,
                          background: "#D96868",
                          fontFamily: fonts.body,
                          fontWeight: 600,
                          padding: "0.25rem 1rem",
                          fontSize: "0.9rem",
                          color: colors.white,
                        }}
                        disabled={actioningId === notification.id}
                        onClick={() => handleDecline(notification.id)}
                      >
                        {actioningId === notification.id
                          ? "Processing..."
                          : "Decline"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Timestamp + per-item mark-as-read */}
                <div className="d-flex flex-column align-items-end gap-2 flex-shrink-0">
                  <span
                    className="rounded-2 px-3 py-1 small fw-semibold"
                    style={{
                      background: colors.greenLrgb,
                      color: colors.charcoal,
                      whiteSpace: "nowrap",
                      opacity: 0.7,
                    }}
                  >
                    {timeAgo(notification.createdAt)}
                  </span>

                  {!notification.read && (
                    <button
                      type="button"
                      className="btn btn-sm mark-btn d-flex align-items-center gap-1"
                      title="Mark as read"
                      style={{
                        border: `1px solid ${colors.greenLrgb}`,
                        borderRadius: 4,
                        background: "transparent",
                        fontWeight: 600,
                        padding: "0.2rem 0.6rem",
                        fontSize: "0.78rem",
                        color: colors.greenXd,
                        whiteSpace: "nowrap",
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleMarkOneRead(notification.id);
                      }}
                    >
                      <Check size={13} strokeWidth={2.5} />
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-end align-items-center gap-2 mt-4">
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center justify-content-center"
            aria-label="Previous page"
            title="Previous page"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: 4,
              border: `2px solid ${colors.greenLrgb}`,
              color: colors.greenXd,
              background: "transparent",
              opacity: currentPage === 1 ? 0.5 : 1,
              padding: 0,
            }}
            disabled={currentPage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronsLeft size={18} strokeWidth={2} />
          </button>

          <span
            style={{
              minWidth: "30px",
              textAlign: "center",
              color: colors.charcoal,
              fontWeight: 700,
            }}
          >
            {currentPage}
          </span>

          <button
            type="button"
            className="btn btn-sm d-flex align-items-center justify-content-center"
            aria-label="Next page"
            title="Next page"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: 4,
              border: `2px solid ${colors.greenLrgb}`,
              color: colors.greenXd,
              background: "transparent",
              opacity: currentPage === totalPages ? 0.5 : 1,
              padding: 0,
            }}
            disabled={currentPage === totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            <ChevronsRight size={18} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}