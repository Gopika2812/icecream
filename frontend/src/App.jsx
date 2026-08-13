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
import QCList from './modules/procurement/QCList';
import VendorLedgers from './modules/procurement/VendorLedgers';
import RawMaterialStock from './modules/inventory/RawMaterialStock';
import ProductionList from './modules/production/ProductionList';
import StoreRoomRequisitions from './modules/production/StoreRoomRequisitions';
import ProductRequisitionList from './modules/procurement/ProductRequisitionList';
import FinishedGoodsStock from './modules/inventory/FinishedGoodsStock';
import SalesInvoice from './modules/inventory/SalesInvoice';
import AutoSalesLedger from './modules/inventory/AutoSalesLedger';
import CustomerLedgers from './modules/inventory/CustomerLedgers';
import AssetsList from './modules/assets/AssetsList';
import VehiclesList from './modules/vehicles/VehiclesList';

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
            
            {/* Master Hub */}
            <Route path="vendors" element={<VendorList />} />
            <Route path="customers" element={<CustomerList />} />
            <Route path="products" element={<ProductList />} />
            
            {/* Operations & Fleet Phase */}
            <Route path="assets" element={<AssetsList />} />
            <Route path="vehicles" element={<VehiclesList />} />

            {/* Procurement & Production */}
            <Route path="purchase-orders" element={<PurchaseOrderList />} />
            <Route path="qc" element={<QCList />} />
            <Route path="vendor-ledgers" element={<VendorLedgers />} />
            <Route path="raw-material-stock" element={<RawMaterialStock />} />
            <Route path="store-room-requisitions" element={<StoreRoomRequisitions />} />
            <Route path="production" element={<ProductionList />} />

            {/* Inventory & Sales */}
            <Route path="finished-goods-stock" element={<FinishedGoodsStock />} />
            <Route path="sales-invoices" element={<SalesInvoice />} />
            <Route path="auto-sales-ledger" element={<AutoSalesLedger />} />
            <Route path="customer-ledgers" element={<CustomerLedgers />} />
            <Route path="inventory" element={<Navigate to="/finished-goods-stock" replace />} />

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
