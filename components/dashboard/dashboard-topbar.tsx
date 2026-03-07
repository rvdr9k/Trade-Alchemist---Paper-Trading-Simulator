import { memo } from "react";
import type { DashboardTab } from "@/components/dashboard/tabs";
import { DashboardTabsNav } from "@/components/dashboard/dashboard-tabs-nav";
import { ProfileMenu } from "@/components/dashboard/profile-menu";

type DashboardTopbarProps = {
  activeTab: DashboardTab;
  isDarkMode: boolean;
  onTabChange: (tab: DashboardTab) => void;
  onThemeToggle: () => void;
  onLogout: () => Promise<void>;
};

export const DashboardTopbar = memo(function DashboardTopbar({
  activeTab,
  isDarkMode,
  onTabChange,
  onThemeToggle,
  onLogout,
}: DashboardTopbarProps) {
  return (
    <header className="ta-topbar">
      <div className="ta-topbar-left">
        <div className="ta-brand">
          <img
            src={isDarkMode ? "/logo-dark.png" : "/logo-light.png"}
            alt="TradeAlchemist Logo"
          />
          <h1 className="ta-app-name">TradeAlchemist</h1>
        </div>

        <DashboardTabsNav activeTab={activeTab} onTabChange={onTabChange} />
      </div>

      <div className="ta-topbar-right">
        <button
          type="button"
          className="ta-theme-toggle"
          onClick={onThemeToggle}
        >
          <img
            src={isDarkMode ? "/sun.png" : "/moon.png"}
            alt="Theme Toggle"
            className="ta-theme-icon"
          />
        </button>

        <ProfileMenu
          onLogout={onLogout}
          isDarkMode={isDarkMode}
        />
      </div>
    </header>
  );
});
