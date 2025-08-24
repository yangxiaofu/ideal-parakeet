import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, CreditCard, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { BillingDashboard } from '../billing/BillingDashboard';
import { SITE_BRANDING } from '../../constants/branding';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try {
      setDropdownOpen(false);
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const handleBillingClick = () => {
    console.log('🔧 Billing button clicked!');
    console.log('📊 Current showBillingModal state:', showBillingModal);
    
    try {
      setDropdownOpen(false);
      setShowBillingModal(true);
      
      console.log('✅ State updated - showBillingModal should now be: true');
      
      // Debug: Force a small delay to see if React updates
      setTimeout(() => {
        console.log('⏰ After timeout - showBillingModal state:', showBillingModal);
        console.log('🔍 Modal should be visible now. Check DOM for modal element.');
      }, 100);
    } catch (error) {
      console.error('❌ Error in handleBillingClick:', error);
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

  // Create the billing modal component
  const BillingModalContent = () => {
    console.log('🎯 Modal is rendering! showBillingModal is:', showBillingModal);
    try {
      return (
        <div className="fixed inset-0 z-modal-high overflow-y-auto" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowBillingModal(false)} />
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full sm:p-0">
              <div className="bg-white">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
                  <button
                    onClick={() => setShowBillingModal(false)}
                    className="rounded-md bg-white text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="px-0 py-0">
                  <BillingDashboard />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error('❌ Error rendering BillingDashboard modal:', error);
      return (
        <div className="fixed inset-0 z-modal-high flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Error Loading Billing Dashboard</h3>
            <p className="text-gray-600 mb-4">There was an error loading the billing dashboard. Please try refreshing the page.</p>
            <button 
              onClick={() => setShowBillingModal(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <>
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
                <div className="relative" ref={dropdownRef}>
                  {/* User Menu Button */}
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={avatarStyle}
                    >
                      <span className="text-white font-medium text-sm">
                        {initials}
                      </span>
                    </div>
                    <div className="pr-1">
                      <span className="text-sm font-medium text-gray-700 block">
                        {user.displayName || 'User'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {user.email}
                      </span>
                    </div>
                    <ChevronDown 
                      className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                        dropdownOpen ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-dropdown">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.displayName || 'User'}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      
                      <button
                        onClick={handleBillingClick}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors duration-150"
                      >
                        <CreditCard className="h-4 w-4 text-gray-500" />
                        <span>Billing & Subscription</span>
                      </button>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors duration-150"
                      >
                        <LogOut className="h-4 w-4 text-gray-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Billing Dashboard Modal - Rendered in Portal */}
      {showBillingModal && createPortal(<BillingModalContent />, document.body)}
    </>
  );
};