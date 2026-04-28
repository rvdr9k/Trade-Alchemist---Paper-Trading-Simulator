"use client";

import { memo, useState } from "react";

type ProfileMenuProps = {
  onLogout: () => Promise<void>;
  isDarkMode: boolean;   // 👈 ADD THIS
};

export const ProfileMenu = memo(function ProfileMenu({
  onLogout,
  isDarkMode,
}: ProfileMenuProps) {

  const [isMenuOpen, setIsMenuOpen] = useState(false);


  const handleLogout = async () => {
    await onLogout();
    setIsMenuOpen(false);
  };

  return (
    <div className="ta-profile-menu">
     <button
        type="button"
        className="ta-profile-button"
        onClick={() => setIsMenuOpen((current) => !current)}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
      >
        <img
          src={isDarkMode ? "/profile-dark.png" : "/profile-light.png"}
          alt="Profile"
          className="ta-profile-icon"
        />
      </button>
      {isMenuOpen ? (
        <div className="ta-profile-dropdown" role="menu">
          <button type="button" role="menuitem">
            Settings
          </button>
          <button type="button" role="menuitem" onClick={handleLogout}>
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
});
