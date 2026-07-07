import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import FoodInventory from './pages/FoodInventory';
import BrowseFoodItem from './pages/BrowseFoodItem';
import AddFoodItem from './pages/AddFoodItem';
import EditFoodItem from './pages/EditFoodItem';
import MealPlanner from './pages/MealPlanner';
import ExpiryAlerts from './pages/ExpiryAlerts';

export default function Dashboard({ onNavigate }) {
  const [activePage, setActivePage] = useState('inventory');
  const [editingItem, setEditingItem] = useState(null);

  const handleFoodAdded = () => {
    setActivePage('inventory');
  };

  const handleFoodEdited = () => {
    setActivePage('inventory');
    setEditingItem(null);
  };

  // Extended navigate: supports ('edit-food', item)
  const handleNavigate = (page, data) => {
    if (page === 'edit-food' && data) {
      setEditingItem(data);
    }
    setActivePage(page);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <DashboardHome />;
      case 'inventory':
        return <FoodInventory onNavigate={handleNavigate} />;
      case 'browse':
        return <BrowseFoodItem onNavigate={handleNavigate} />;
      case 'expiry':
        return <ExpiryAlerts onNavigate={handleNavigate} />;
      case 'add-food':
        return <AddFoodItem onSuccess={handleFoodAdded} onCancel={() => setActivePage('inventory')} />;
      case 'edit-food':
        return editingItem
          ? <EditFoodItem item={editingItem} onSuccess={handleFoodEdited} onCancel={() => setActivePage('inventory')} />
          : <FoodInventory onNavigate={handleNavigate} />;
      case 'meal-planner':
        return <MealPlanner />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <DashboardLayout
      activePage={activePage}
      onPageChange={handleNavigate}
      onNavigate={onNavigate}
    >
      {renderPage()}
    </DashboardLayout>
  );
}
