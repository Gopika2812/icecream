import React, { useState } from 'react';
import { Outlet, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Building2, Users, Menu, X, ChevronDown } from 'lucide-react';
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
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-white/20 text-white font-medium' : 'text-pink-100 hover:bg-white/10 hover:text-white'}`}
      >
        <Icon size={18} /> {children}
      </Link>
    );
  };

  const NavGroup = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
      <div className="mb-2 mt-2">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-pink-200 uppercase tracking-wider hover:text-white transition-colors group rounded-lg hover:bg-white/5"
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
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-white/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--color-primary)] border-y-0 border-l-0 border-r border-pink-400 rounded-none flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-[var(--color-glass-border)] flex justify-between items-start">
          <div className="flex flex-col gap-3">
            <img src="/logo.avif" alt="Logo" className="w-48 h-20 rounded-xl shadow-sm object-cover object-center" />
            <div>
              <h2 className="text-xl font-bold text-white tracking-wider">SARAVANASS</h2>
              <p className="text-xs text-pink-200 mt-1">ERP SYSTEM</p>
            </div>
          </div>
          <button 
            className="lg:hidden text-white hover:text-pink-100"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto">
          <NavGroup title="Dashboard">
            <NavItem to="/dashboard" icon={LayoutDashboard}>Overview</NavItem>
          </NavGroup>

          <NavGroup title="Master Hub">
            <NavItem to="/vendors" icon={Building2}>Vendors</NavItem>
            <NavItem to="/customers" icon={Users}>Customers</NavItem>
            <NavItem to="/products" icon={LayoutDashboard}>Products</NavItem>
          </NavGroup>

          <NavGroup title="Procurement">
            <NavItem to="/purchase-orders" icon={LayoutDashboard}>Purchase Orders</NavItem>
            <NavItem to="/qc" icon={LayoutDashboard}>Quality Control</NavItem>
          </NavGroup>

          <NavGroup title="Inventory">
            <NavItem to="/inventory" icon={LayoutDashboard}>Stock Levels</NavItem>
          </NavGroup>

          <NavGroup title="Admin">
            <NavItem to="/branches" icon={Building2}>Branches</NavItem>
            <NavItem to="/users" icon={Users}>Users</NavItem>
          </NavGroup>
        </nav>

        <div className="p-4 border-t border-[var(--color-glass-border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 min-w-[40px] rounded-full bg-white text-[var(--color-primary)] flex items-center justify-center font-bold text-lg">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="font-medium text-white truncate">{user.name || 'User'}</div>
              <div className="text-xs text-pink-200 font-semibold truncate">{user.role || 'Role'}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-white hover:text-pink-200 w-full px-2 py-2 rounded transition-colors hover:bg-white/10"
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
              className="lg:hidden text-gray-700 hover:text-gray-900 p-1 rounded-md hover:bg-[var(--color-glass)]"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="text-lg font-medium text-gray-800 hidden sm:block">
              {/* Breadcrumbs or Page Title could go here */}
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">Current Branch:</span>
            <div className="px-2 sm:px-3 py-1 bg-[var(--color-glass)] border border-[var(--color-glass-border)] rounded-md text-xs sm:text-sm text-gray-900 truncate max-w-[120px] sm:max-w-xs">
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
