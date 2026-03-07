import { memo } from "react";
import { dashboardTabs, type DashboardTab } from "@/components/dashboard/tabs";

type DashboardTabsNavProps = {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
};

export const DashboardTabsNav = memo(function DashboardTabsNav({
  activeTab,
  onTabChange,
}: DashboardTabsNavProps) {
  return (
    <nav className="ta-tabs" aria-label="Dashboard navigation">
      {dashboardTabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`ta-tab ${activeTab === tab ? "active" : ""}`}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
});
