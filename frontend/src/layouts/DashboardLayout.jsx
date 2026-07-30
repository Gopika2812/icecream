import React, { useState } from 'react';
import { Outlet, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LogOut, LayoutDashboard, Building2, Users, Menu, X, ChevronDown, 
  Package, ShoppingCart, ShieldCheck, GitBranch, ChevronLeft, ChevronRight, PanelLeft, ArrowLeftRight, Factory, ThermometerSnowflake 
} from 'lucide-react';
import api from '../services/api';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Sidebar default state: OPEN / EXPANDED by default for maximum comfort
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const token = localStorage.getItem('accessToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const NavItem = ({ to, icon: Icon, title }) => {
    const isActive = location.pathname.startsWith(to);
    return (
      <Link 
        to={to} 
        onClick={() => setIsMobileOpen(false)}
        title={isCollapsed ? title : ''}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
          isActive 
            ? 'bg-white/20 text-white font-semibold shadow-sm' 
            : 'text-pink-100 hover:bg-white/10 hover:text-white'
        } ${isCollapsed ? 'justify-center' : ''}`}
      >
        <Icon size={20} className="shrink-0" />
        {!isCollapsed && <span className="truncate">{title}</span>}
      </Link>
    );
  };

  const NavGroup = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (isCollapsed) {
      return (
        <div className="py-2 border-b border-pink-400/20 last:border-b-0 space-y-1">
          {children}
        </div>
      );
    }

    return (
      <div className="mb-2 mt-2">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-pink-200 uppercase tracking-wider hover:text-white transition-colors group rounded-lg hover:bg-white/5"
        >
          <span>{title}</span>
          <ChevronDown 
            size={14} 
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : 'text-pink-300 group-hover:text-white'}`} 
          />
        </button>
        
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-1">
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[var(--color-primary)]/15 overflow-hidden text-sm">
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 bg-[var(--color-primary)] border-r border-pink-400/30 flex flex-col transition-all duration-300 ease-in-out lg:relative ${
        isCollapsed ? 'w-20' : 'w-64'
      } ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Sidebar Header */}
        <div className={`p-4 border-b border-pink-400/30 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <img src="/logo.avif" alt="Logo" className="w-12 h-12 rounded-xl shadow-sm object-cover" />
              <div>
                <h2 className="text-base font-extrabold text-white tracking-wider">SARAVANASS</h2>
                <p className="text-[10px] font-semibold text-pink-200 tracking-wide">ERP SYSTEM</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <img src="/logo.avif" alt="Logo" className="w-10 h-10 rounded-xl shadow-sm object-cover" />
            </div>
          )}

          {/* Toggle button inside sidebar header on desktop */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-pink-100 hover:text-white hover:bg-white/10 transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* Mobile close button */}
          <button 
            className="lg:hidden text-white hover:text-pink-100 p-1"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-1">
          <NavGroup title="Dashboard">
            <NavItem to="/dashboard" icon={LayoutDashboard} title="Overview" />
          </NavGroup>

          <NavGroup title="Master Hub">
            <NavItem to="/vendors" icon={Building2} title="Vendors" />
            <NavItem to="/customers" icon={Users} title="Customers" />
            <NavItem to="/products" icon={Package} title="Products" />
          </NavGroup>

          <NavGroup title="Procurement & Production">
            <NavItem to="/purchase-orders" icon={ShoppingCart} title="Purchase Orders" />
            <NavItem to="/qc" icon={ShieldCheck} title="Quality Control" />
            <NavItem to="/raw-material-stock" icon={ArrowLeftRight} title="Raw Material Stock" />
            <NavItem to="/production" icon={Factory} title="Production & Assembly" />
          </NavGroup>

          <NavGroup title="Inventory">
            <NavItem to="/finished-goods-stock" icon={ThermometerSnowflake} title="Finished Goods Stock" />
          </NavGroup>

          <NavGroup title="Admin">
            <NavItem to="/branches" icon={GitBranch} title="Branches" />
            <NavItem to="/users" icon={Users} title="Users" />
          </NavGroup>
        </nav>

        {/* User Profile & Logout Footer */}
        <div className="p-3 border-t border-pink-400/30">
          {!isCollapsed ? (
            <div>
              <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-white/10">
                <div className="w-9 h-9 min-w-[36px] rounded-full bg-white text-[var(--color-primary)] flex items-center justify-center font-bold text-base shadow-sm">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <div className="overflow-hidden">
                  <div className="font-semibold text-white truncate text-xs">{user.name || 'System Admin'}</div>
                  <div className="text-[10px] text-pink-200 font-medium truncate">{user.role || 'Super Admin'}</div>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-xs font-semibold text-white hover:text-pink-200 w-full px-3 py-2 rounded-lg transition-colors hover:bg-white/10"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div 
                className="w-10 h-10 rounded-full bg-white text-[var(--color-primary)] flex items-center justify-center font-bold text-base shadow-sm cursor-pointer"
                title={`${user.name || 'User'} (${user.role || 'Role'})`}
              >
                {user.name?.charAt(0) || 'U'}
              </div>
              <button 
                onClick={handleLogout}
                title="Logout"
                className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden w-full">
        {/* Header Bar */}
        <header className="h-16 glass-panel border-x-0 border-t-0 rounded-none flex items-center justify-between px-4 lg:px-6 z-10 w-full">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button 
              className="lg:hidden text-gray-700 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={20} />
            </button>

            {/* Desktop Collapse / Expand Sidebar Toggle Button */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all text-xs font-bold shadow-sm"
              title={isCollapsed ? "Expand Sidebar Menu" : "Collapse Sidebar Menu"}
            >
              <PanelLeft size={16} />
              <span>{isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline font-medium">Current Branch:</span>
            <div className="px-3 py-1 bg-white/80 border border-[var(--color-glass-border)] rounded-lg text-xs sm:text-sm font-semibold text-gray-900 shadow-sm truncate max-w-[140px] sm:max-w-xs">
              Main Branch
            </div>
          </div>
        </header>

        {/* Page Content View */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative z-0">
          <div className="fixed top-20 right-20 w-[300px] h-[300px] lg:w-[500px] lg:h-[500px] bg-[var(--color-primary)] rounded-full blur-[100px] lg:blur-[150px] opacity-[0.05] pointer-events-none"></div>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
