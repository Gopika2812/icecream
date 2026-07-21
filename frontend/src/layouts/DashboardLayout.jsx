import React, { useState } from 'react';
import { Outlet, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Building2, Users, Menu, X } from 'lucide-react';
import api from '../services/api';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  const NavItem = ({ to, icon: Icon, children }) => {
    const isActive = location.pathname.startsWith(to);
    return (
      <Link 
        to={to} 
        onClick={() => setIsSidebarOpen(false)}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-[var(--color-primary-soft)] text-white' : 'text-gray-400 hover:bg-[var(--color-glass)] hover:text-white'}`}
      >
        <Icon size={18} /> {children}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-[var(--color-secondary)] overflow-hidden text-sm">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 glass-panel border-y-0 border-l-0 rounded-none flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-[var(--color-glass-border)] flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wider">SARAVANASS</h2>
            <p className="text-xs text-[var(--color-primary)] mt-1">ERP SYSTEM</p>
          </div>
          <button 
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2 px-3">Dashboard</div>
          <NavItem to="/dashboard" icon={LayoutDashboard}>Overview</NavItem>

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6 px-3">Master Hub</div>
          <NavItem to="/vendors" icon={Building2}>Vendors</NavItem>
          <NavItem to="/customers" icon={Users}>Customers</NavItem>
          <NavItem to="/products" icon={LayoutDashboard}>Products</NavItem>

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6 px-3">Procurement</div>
          <NavItem to="/purchase-orders" icon={LayoutDashboard}>Purchase Orders</NavItem>
          <NavItem to="/grn" icon={LayoutDashboard}>Goods Receiving</NavItem>

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6 px-3">Inventory</div>
          <NavItem to="/inventory" icon={LayoutDashboard}>Stock Levels</NavItem>

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6 px-3">Admin</div>
          <NavItem to="/branches" icon={Building2}>Branches</NavItem>
          <NavItem to="/users" icon={Users}>Users</NavItem>
        </nav>

        <div className="p-4 border-t border-[var(--color-glass-border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 min-w-[40px] rounded-full bg-[var(--color-primary)] flex items-center justify-center font-bold text-lg">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="font-medium text-white truncate">{user.name || 'User'}</div>
              <div className="text-xs text-[var(--color-primary)] font-semibold truncate">{user.role || 'Role'}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 w-full px-2 py-2 rounded transition-colors hover:bg-[rgba(255,0,0,0.1)]"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden w-full">
        {/* Header */}
        <header className="h-16 glass-panel border-x-0 border-t-0 rounded-none flex items-center justify-between px-4 lg:px-8 z-10 w-full">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden text-gray-300 hover:text-white p-1 rounded-md hover:bg-[var(--color-glass)]"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="text-lg font-medium text-gray-200 hidden sm:block">
              {/* Breadcrumbs or Page Title could go here */}
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline">Current Branch:</span>
            <div className="px-2 sm:px-3 py-1 bg-[var(--color-glass)] border border-[var(--color-glass-border)] rounded-md text-xs sm:text-sm text-white truncate max-w-[120px] sm:max-w-xs">
              Main Branch
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative z-0">
           {/* Background subtle elements */}
           <div className="fixed top-20 right-20 w-[300px] h-[300px] lg:w-[500px] lg:h-[500px] bg-[var(--color-primary)] rounded-full blur-[100px] lg:blur-[150px] opacity-[0.05] pointer-events-none"></div>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
