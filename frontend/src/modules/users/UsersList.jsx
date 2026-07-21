import React from 'react';

const UsersList = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <button className="glass-button">Add User</button>
      </div>
      <div className="glass-panel p-6">
        <p className="text-gray-400">User list table will be implemented here.</p>
      </div>
    </div>
  );
};

export default UsersList;
