import React, { useState } from 'react';
import { User, LogOut, ChevronDown } from 'lucide-react';

interface UserProfileProps {
  name: string;
  email: string;
  onLogout: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ name, email, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    onLogout();
  };

  // Get initials for avatar
  const getInitials = () => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
            {getInitials()}
          </div>
          <div className="ml-3">
            <p className="font-medium">{name}</p>
            <p className="text-sm text-gray-500">{email}</p>
          </div>
        </div>
        
        <button 
          onClick={toggleMenu}
          className="flex items-center text-gray-700 hover:text-blue-600 focus:outline-none"
        >
          <span className="mr-1 hidden sm:inline">Account</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      
      {isMenuOpen && (
        <div className="absolute right-4 top-16 w-48 bg-white rounded-md shadow-lg z-10 py-1 border border-gray-200">
          <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
            <p className="font-semibold">{name}</p>
            <p className="text-xs text-gray-500 truncate">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfile;