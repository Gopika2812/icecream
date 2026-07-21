import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, CheckCircle, XCircle } from 'lucide-react';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/users/${id}`, { status: 'Active' });
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Failed to approve user', error);
      alert('Failed to approve user');
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to deactivate user', error);
      alert('Failed to deactivate user');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="text-[var(--color-primary)]" />
            Users & Approvals
          </h1>
          <p className="text-sm text-gray-600 mt-1">Manage system access and approve new employee registrations.</p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-medium">EMP ID</th>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Username</th>
                  <th className="px-6 py-4 font-medium">Branch</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{user.employeeId}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4">{user.username}</td>
                    <td className="px-6 py-4">
                      {user.primaryBranch ? (
                        <span className="text-[var(--color-primary)]">{user.primaryBranch.branchCode} - {user.primaryBranch.city}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">{user.role?.name || 'User'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs border ${
                        user.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                        user.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {user.status === 'Pending' && (
                          <button 
                            onClick={() => handleApprove(user._id)}
                            className="flex items-center gap-1 px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors text-xs border border-green-500/30"
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                        )}
                        {user.status === 'Active' && user.username !== 'admin' && (
                          <button 
                            onClick={() => handleDeactivate(user._id)}
                            className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Deactivate User"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-600">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersList;
