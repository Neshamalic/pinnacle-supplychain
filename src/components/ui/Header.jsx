import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [notifications, setNotifications] = useState({
    dashboard: 3,
    'tender-management': 0,
    'purchase-order-tracking': 2,
    'import-management': 1,
    'demand-forecasting': 0,
    'communications-log': 5
  });

  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    {
      id: 'dashboard',
      labelEn: 'Dashboard',
      labelEs: 'Panel de Control',
      path: '/dashboard',
      icon: 'LayoutDashboard'
    },
    {
      id: 'tender-management',
      labelEn: 'Tenders',
      labelEs: 'Licitaciones',
      path: '/tender-management',
      icon: 'FileText'
    },
    {
      id: 'purchase-order-tracking',
      labelEn: 'Orders',
      labelEs: 'Órdenes',
      path: '/purchase-order-tracking',
      icon: 'ShoppingCart'
    },
    {
      id: 'import-management',
      labelEn: 'Imports',
      labelEs: 'Importaciones',
      path: '/import-management',
      icon: 'Truck'
    },
    {
      id: 'demand-forecasting',
      labelEn: 'Forecasting',
      labelEs: 'Pronósticos',
      path: '/demand-forecasting',
      icon: 'TrendingUp'
    },
    {
      id: 'communications-log',
      labelEn: 'Communications',
      labelEs: 'Comunicaciones',
      path: '/communications-log',
      icon: 'MessageSquare'
    }
  ];

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  const handleLanguageToggle = () => {
    const newLanguage = currentLanguage === 'en' ? 'es' : 'en';
    setCurrentLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const getActiveTab = () => {
    return navigationItems?.find(item => item?.path === location?.pathname)?.id || 'dashboard';
  };

  const getLabel = (item) => {
    return currentLanguage === 'es' ? item?.labelEs : item?.labelEn;
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-1000 bg-card border-b border-border shadow-soft">
        <div className="flex items-center justify-between h-16 px-6">
          {/* Logo */}
          <div className="flex items-center">
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => handleNavigation('/dashboard')}
            >
              <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg mr-3">
                <Icon name="Zap" size={20} color="white" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">PinnacleFlow</h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems?.map((item) => (
              <button
                key={item?.id}
                onClick={() => handleNavigation(item?.path)}
                className={`nav-tab ${getActiveTab() === item?.id ? 'active' : ''}`}
              >
                <div className="flex items-center space-x-2 relative">
                  <Icon name={item?.icon} size={16} />
                  <span>{getLabel(item)}</span>
                  {notifications?.[item?.id] > 0 && (
                    <span className="notification-badge">
                      {notifications?.[item?.id]}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Language Toggle */}
            <button
              onClick={handleLanguageToggle}
              className="language-toggle"
              title={currentLanguage === 'en' ? 'Switch to Spanish' : 'Cambiar a Inglés'}
            >
              <Icon name="Globe" size={16} />
              <span className="hidden sm:inline">
                {currentLanguage === 'en' ? 'EN' : 'ES'}
              </span>
            </button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Icon name="Menu" size={20} />
            </Button>
          </div>
        </div>
      </header>
      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-overlay md:hidden">
          <div className="mobile-nav-content">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg mr-3">
                  <Icon name="Zap" size={20} color="white" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">PinnacleFlow</h1>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon name="X" size={20} />
              </Button>
            </div>

            <nav className="p-6">
              <div className="space-y-2">
                {navigationItems?.map((item) => (
                  <button
                    key={item?.id}
                    onClick={() => handleNavigation(item?.path)}
                    className={`w-full flex items-center justify-between p-3 rounded-md text-left transition-colors duration-200 ${
                      getActiveTab() === item?.id
                        ? 'bg-primary/10 text-primary' :'text-secondary hover:text-primary hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon name={item?.icon} size={20} />
                      <span className="font-medium">{getLabel(item)}</span>
                    </div>
                    {notifications?.[item?.id] > 0 && (
                      <span className="flex items-center justify-center w-6 h-6 bg-error text-error-foreground text-xs font-medium rounded-full">
                        {notifications?.[item?.id]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <button
                  onClick={handleLanguageToggle}
                  className="w-full flex items-center space-x-3 p-3 text-secondary hover:text-primary transition-colors duration-200"
                >
                  <Icon name="Globe" size={20} />
                  <span className="font-medium">
                    {currentLanguage === 'en' ? 'Switch to Spanish' : 'Cambiar a Inglés'}
                  </span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;