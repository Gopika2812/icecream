import React from 'react';

const AdminDashboard = () => {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-gray-400 text-sm">Total Branches</h3>
          <p className="text-3xl font-bold mt-2">12</p>
        </div>
        <div className="glass-panel p-6">
          <h3 className="text-gray-400 text-sm">Total Users</h3>
          <p className="text-3xl font-bold mt-2">45</p>
        </div>
        <div className="glass-panel p-6">
          <h3 className="text-gray-400 text-sm">Today's Sales Value</h3>
          <p className="text-3xl font-bold mt-2 text-[var(--color-primary)]">₹ 1,25,000</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
