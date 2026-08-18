export function formatActivityTime(timestamp) {
  if (!timestamp) return "Just now";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "Just now";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function getActivityConfig(type) {
  switch (type) {
    case "ADDED":
      return { bg: "#E8F5E9", color: "#2E7D32", label: "Added" };
    case "UPDATED":
      return { bg: "#E3F2FD", color: "#1565C0", label: "Updated" };
    case "USED":
      return { bg: "#FFF8E1", color: "#B78103", label: "Used" };
    case "DONATED":
      return { bg: "#F3E5F5", color: "#7B1FA2", label: "Donated" };
    case "WASTED":
      return { bg: "#FFEBEE", color: "#C62828", label: "Expired" };
    case "REMOVED":
      return { bg: "#F3F4F6", color: "#4B5563", label: "Removed" };
    case "MEAL_PLANNED":
      return { bg: "#EDE7F6", color: "#5E35B1", label: "Meal Planned" };
    case "LISTED_FOR_DONATION":
      return { bg: "#E0F2F1", color: "#00695C", label: "Listed for Donation" };
    case "REVERTED_TO_INVENTORY":
      return { bg: "#F3F4F6", color: "#4B5563", label: "Reverted" };
    default:
      return { bg: "#E8F5E9", color: "#2E7D32", label: "Activity" };
  }
}

export function describeActivity(entry) {
  const type = entry.type || "";
  const name = entry.itemName || entry.category || "an item";
  switch (type) {
    case "ADDED":
      return `Added ${name}`;
    case "UPDATED":
      return `Updated ${name}`;
    case "USED":
      return `Used ${name}`;
    case "DONATED":
      return `Donated ${name}`;
    case "WASTED":
      return `Expired ${name}`;
    case "REMOVED":
      return `Removed ${name}`;
    case "REQUESTED":
      return `Requested ${name}`;
    case "MEAL_PLANNED":
      return name && name !== "an item"
        ? `Planned meal: ${name}`
        : "Planned a meal";
    case "LISTED_FOR_DONATION":
      return `Listed ${name} for donation`;
    case "REVERTED_TO_INVENTORY":
      return `Reverted ${name} to inventory`;
    default:
      return entry.title || `${type} ${name}`;
  }
}

// Normalizes a raw FoodActivityLog row from the backend into the shape the
// UI renders. Keeps `category`/`itemName`/`quantity` around (not just the
// derived `title`) so consumers like Analytics can filter/group by them.
export function mapBackendActivity(recent) {
  return (Array.isArray(recent) ? recent : []).map((r) => ({
    id: `backend-${r.id || Math.random()}`,
    type: r.type || "ADDED",
    category: r.category || "Other",
    itemName: r.itemName || null,
    quantity: typeof r.quantity === "number" ? r.quantity : null,
    title: describeActivity(r),
    timestamp: r.occurredAt || r.createdAt || new Date().toISOString(),
  }));
}

export function mergeActivity(backendEntries, limit = 20) {
  return [...backendEntries]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}
