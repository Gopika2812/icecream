// Role and Page Permission Control Utilities for Saravanaa ERP System

export const ALL_SYSTEM_PAGES = [
  { path: '/dashboard', label: 'Dashboard / Overview', group: 'Dashboard' },
  { path: '/purchase-orders', label: 'Purchase Invoice', group: 'Purchase Phase' },
  { path: '/qc', label: 'Quality Control', group: 'Purchase Phase' },
  { path: '/vendor-ledgers', label: 'Vendor Ledgers & Payments', group: 'Purchase Phase' },
  { path: '/raw-material-stock', label: 'Raw Material Stock', group: 'Purchase Phase' },
  { path: '/store-room-requisitions', label: 'Store Room Requisitions', group: 'Production Phase' },
  { path: '/production', label: 'Production & Assembly', group: 'Production Phase' },
  { path: '/finished-goods-stock', label: 'Finished Goods Stock (Cold Room)', group: 'Production Phase' },
  { path: '/sales-invoices', label: 'Sales Orders & Invoicing', group: 'Sales & Finance Phase' },
  { path: '/auto-sales-ledger', label: 'Auto Sales Stock & Expenses', group: 'Sales & Finance Phase' },
  { path: '/customer-ledgers', label: 'Customer Ledgers', group: 'Sales & Finance Phase' },
  { path: '/vendors', label: 'Vendors Master', group: 'Master Hub' },
  { path: '/customers', label: 'Customers Master', group: 'Master Hub' },
  { path: '/products', label: 'Products Master', group: 'Master Hub' },
  { path: '/branches', label: 'Branches Admin', group: 'Admin' },
  { path: '/users', label: 'Users & Permissions Admin', group: 'Admin' }
];

export const SYSTEM_ROLES = [
  'Super Admin',
  'Purchase Team',
  'QC Team',
  'Production Team',
  'Sales Team',
  'Store Room Team'
];

export const DEFAULT_ROLE_PERMISSIONS = {
  'Super Admin': ALL_SYSTEM_PAGES.map(p => p.path),
  'Purchase Team': [
    '/dashboard',
    '/purchase-orders',
    '/qc',
    '/vendor-ledgers',
    '/raw-material-stock',
    '/vendors',
    '/products'
  ],
  'QC Team': [
    '/dashboard',
    '/qc',
    '/raw-material-stock'
  ],
  'Production Team': [
    '/dashboard',
    '/raw-material-stock',
    '/store-room-requisitions',
    '/production',
    '/finished-goods-stock',
    '/products'
  ],
  'Sales Team': [
    '/dashboard',
    '/finished-goods-stock',
    '/sales-invoices',
    '/auto-sales-ledger',
    '/customer-ledgers',
    '/customers',
    '/products'
  ],
  'Store Room Team': [
    '/dashboard',
    '/store-room-requisitions',
    '/raw-material-stock'
  ]
};

export const hasPageAccess = (userObj, pagePath) => {
  if (!userObj) return false;
  
  const roleName = typeof userObj.role === 'object' ? userObj.role?.name : userObj.role;

  // Super Admin has full unrestricted access
  if (roleName === 'Super Admin' || roleName === 'SuperAdmin' || roleName === 'Admin' || userObj.username === 'admin') {
    return true;
  }

  // Check explicit custom user-level permissions if defined and non-empty
  if (Array.isArray(userObj.allowedPages) && userObj.allowedPages.length > 0) {
    return userObj.allowedPages.includes('*') || userObj.allowedPages.includes(pagePath);
  }

  // Fallback to role-based default permissions
  const defaultRolePages = DEFAULT_ROLE_PERMISSIONS[roleName] || [];
  return defaultRolePages.includes(pagePath);
};
