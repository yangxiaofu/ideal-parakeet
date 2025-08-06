import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';

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
  const initials = getInitials(user?.displayName, user?.email);

  // Create inline gradient style
  const avatarStyle = {
    background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
  };

  return (
    <header className="bg-white border-b border-slate-200/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto" style={{ paddingLeft: '4rem', paddingRight: '4rem' }}>
        <div className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Intrinsic Value Calculator
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Professional Equity Valuation
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <div className="group flex items-center space-x-3 px-4 py-2.5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 cursor-pointer">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-200"
                    style={avatarStyle}
                  >
                    <span className="text-white font-semibold text-sm tracking-wide">
                      {initials}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
                      {user.displayName || 'User'}
                    </span>
                    <span className="text-xs text-slate-500 group-hover:text-slate-600 transition-colors">
                      {user.email}
                    </span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  className="hover:bg-red-50 hover:border-red-200 hover:text-red-600 border-slate-200 text-slate-600 transition-all duration-200"
                >
                  Sign Out
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};