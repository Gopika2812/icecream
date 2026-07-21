import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './modules/auth/Login';
import DashboardLayout from './layouts/DashboardLayout';
import AdminDashboard from './modules/dashboard/AdminDashboard';
import BranchesList from './modules/branches/BranchesList';
import UsersList from './modules/users/UsersList';
import VendorList from './modules/procurement/VendorList';
import CustomerList from './modules/procurement/CustomerList';
import ProductList from './modules/procurement/ProductList';
import PurchaseOrderList from './modules/procurement/PurchaseOrderList';
import GRNList from './modules/procurement/GRNList';
import InventoryDashboard from './modules/inventory/InventoryDashboard';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            
            {/* Master Hub & Procurement & Inventory */}
            <Route path="vendors" element={<VendorList />} />
            <Route path="customers" element={<CustomerList />} />
            <Route path="products" element={<ProductList />} />
            <Route path="purchase-orders" element={<PurchaseOrderList />} />
            <Route path="grn" element={<GRNList />} />
            <Route path="inventory" element={<InventoryDashboard />} />

            {/* Admin */}
            <Route path="branches" element={<BranchesList />} />
            <Route path="users" element={<UsersList />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
