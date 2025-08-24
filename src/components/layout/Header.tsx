import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SITE_BRANDING } from '../../constants/branding';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // Function to extract initials from name or email
  const getInitials = (name: string | null, email: string | null): string => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      const username = email.split('@')[0];
      return username.substring(0, 2).toUpperCase();
    }
    return 'US';
  };

  // Generate consistent gradient colors based on user info
  const getAvatarGradient = (identifier: string): { from: string; to: string } => {
    const gradients = [
      { from: '#3b82f6', to: '#2563eb' }, // Blue
      { from: '#a855f7', to: '#9333ea' }, // Purple
      { from: '#22c55e', to: '#16a34a' }, // Green
      { from: '#6366f1', to: '#4f46e5' }, // Indigo
      { from: '#ec4899', to: '#db2777' }, // Pink
      { from: '#14b8a6', to: '#0d9488' }, // Teal
    ];
    
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  const userIdentifier = user?.email || user?.displayName || 'user';
  const gradient = getAvatarGradient(userIdentifier);
  const initials = getInitials(user?.displayName || null, user?.email || null);

  // Create inline gradient style
  const avatarStyle = {
    background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">{SITE_BRANDING.logoInitials}</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800 tracking-tight">
                {SITE_BRANDING.name}
              </h1>
              <p className="text-xs text-gray-500">
                {SITE_BRANDING.tagline}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {user && (
              <>
                <div className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-2xl">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={avatarStyle}
                  >
                    <span className="text-white font-medium text-sm">
                      {initials}
                    </span>
                  </div>
                  <div className="pr-2">
                    <span className="text-sm font-medium text-gray-700 block">
                      {user.displayName || 'User'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {user.email}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-200"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};