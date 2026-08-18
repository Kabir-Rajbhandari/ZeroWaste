import { useEffect, useState } from "react";
import DashboardLayout from "./DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import FoodInventory from "./pages/FoodInventory";
import DonationListing from "./pages/DonationListing";
import BrowseFoodItem from "./pages/BrowseFoodItem";
import AddFoodItem from "./pages/AddFoodItem";
import EditFoodItem from "./pages/EditfoodItem";
import MealPlanner from "./pages/MealPlanner";
import ExpiryAlerts from "./pages/ExpiryAlerts";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Analytics from "./pages/Analytics";
import { notificationApi } from "../../services/api";

export default function Dashboard({ onNavigate }) {
  const [activePage, setActivePage] = useState("overview");
  const [editingItem, setEditingItem] = useState(null);

  const [mealPlannerItem, setMealPlannerItem] = useState(null);

  const [profileVersion, setProfileVersion] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (activePage === "notifications") return;

    let isMounted = true;

    const loadUnreadCount = async () => {
      try {
        const data = await notificationApi.getUnreadCount();

        if (isMounted) {
          setUnreadCount(data?.count || 0);
        }
      } catch {
        // Non-critical.
      }
    };

    loadUnreadCount();

    const intervalId = window.setInterval(loadUnreadCount, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [activePage]);

  const handleFoodAdded = () => {
    setActivePage("inventory");
  };

  const handleFoodEdited = () => {
    setActivePage("inventory");
    setEditingItem(null);
  };

  const handleNavigate = (page, data) => {
    const targetPage = page === "alerts" ? "expiry" : page;

    if (targetPage === "edit-food" && data) {
      setEditingItem(data);
    }

    if (targetPage === "meal-planner" && data) {
      setMealPlannerItem(data);
    }

    setActivePage(targetPage);
  };

  const renderPage = () => {
    switch (activePage) {
      case "overview":
        return <DashboardHome onNavigate={handleNavigate} />;

      case "inventory":
        return <FoodInventory onNavigate={handleNavigate} />;

      case "donation-listing":
        return <DonationListing onNavigate={handleNavigate} />;

      case "browse":
        return <BrowseFoodItem onNavigate={handleNavigate} />;

      case "expiry":
        return <ExpiryAlerts onNavigate={handleNavigate} />;

      case "add-food":
        return (
          <AddFoodItem
            onSuccess={handleFoodAdded}
            onCancel={() => setActivePage("inventory")}
          />
        );

      case "edit-food":
        return editingItem ? (
          <EditFoodItem
            item={editingItem}
            onSuccess={handleFoodEdited}
            onCancel={() => setActivePage("inventory")}
          />
        ) : (
          <FoodInventory onNavigate={handleNavigate} />
        );

      case "meal-planner":
        return (
          <MealPlanner
            initialItem={mealPlannerItem}
            onInitialItemConsumed={() => setMealPlannerItem(null)}
          />
        );

      case "settings":
        return (
          <Settings onProfileUpdated={() => setProfileVersion((v) => v + 1)} />
        );

      case "notifications":
        return (
          <Notifications
            onUnreadCountChange={setUnreadCount}
            onNavigate={handleNavigate}
          />
        );

      case "analytics":
        return <Analytics />;

      default:
        return <DashboardHome />;
    }
  };

  return (
    <DashboardLayout
      key={profileVersion}
      activePage={activePage}
      onPageChange={handleNavigate}
      onNavigate={onNavigate}
      unreadCount={unreadCount}
    >
      {renderPage()}
    </DashboardLayout>
  );
}
