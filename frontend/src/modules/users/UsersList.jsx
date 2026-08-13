import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Users, ShieldCheck, CheckCircle, XCircle, Plus, Edit3, Lock, 
  Building2, Check, Key, UserCheck, ShieldAlert
} from 'lucide-react';
import Modal from '../../components/Modal';
import { ALL_SYSTEM_PAGES, SYSTEM_ROLES, DEFAULT_ROLE_PERMISSIONS } from '../../utils/permissions';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    employeeId: '',
    role: 'Purchase Team',
    status: 'Active',
    primaryBranch: '',
    allowedPages: []
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [usersRes, branchesRes] = await Promise.all([
        api.get('/users'),
        api.get('/branches')
      ]);
      setUsers(usersRes.data.data || []);
      setBranches(branchesRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch initial users data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    const defaultBranchId = branches.length > 0 ? (branches[0]._id || branches[0].id) : '';
    const initialRole = 'Purchase Team';
    setFormData({
      name: '',
      username: '',
      email: '',
      password: '',
      employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      role: initialRole,
      status: 'Active',
      primaryBranch: defaultBranchId,
      allowedPages: DEFAULT_ROLE_PERMISSIONS[initialRole] || []
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    const userRole = typeof user.role === 'object' ? (user.role?.name || 'Purchase Team') : (user.role || 'Purchase Team');
    const existingAllowedPages = Array.isArray(user.allowedPages) && user.allowedPages.length > 0 
      ? user.allowedPages 
      : (DEFAULT_ROLE_PERMISSIONS[userRole] || []);

    const branchId = user.primaryBranch 
      ? (typeof user.primaryBranch === 'object' ? user.primaryBranch._id : user.primaryBranch)
      : (branches.length > 0 ? branches[0]._id : '');

    setFormData({
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      password: '', // leave empty unless updating
      employeeId: user.employeeId || '',
      role: userRole,
      status: user.status || 'Active',
      primaryBranch: branchId,
      allowedPages: existingAllowedPages
    });
    setIsEditModalOpen(true);
  };

  const handleRolePresetSelect = (roleName) => {
    const defaultPages = DEFAULT_ROLE_PERMISSIONS[roleName] || [];
    setFormData(prev => ({
      ...prev,
      role: roleName,
      allowedPages: defaultPages
    }));
  };

  const handleTogglePagePermission = (pagePath) => {
    setFormData(prev => {
      const exists = prev.allowedPages.includes(pagePath);
      const updated = exists 
        ? prev.allowedPages.filter(p => p !== pagePath)
        : [...prev.allowedPages, pagePath];
      return { ...prev, allowedPages: updated };
    });
  };

  const handleSelectAllPages = () => {
    setFormData(prev => ({
      ...prev,
      allowedPages: ALL_SYSTEM_PAGES.map(p => p.path)
    }));
  };

  const handleDeselectAllPages = () => {
    setFormData(prev => ({
      ...prev,
      allowedPages: []
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.password) {
      return alert('Name, Username, and Password are required.');
    }

    try {
      setSubmitting(true);
      await api.post('/users', formData);
      alert('User Account Created Successfully!');
      setIsCreateModalOpen(false);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to create user', error);
      alert(error.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        primaryBranch: formData.primaryBranch,
        allowedPages: formData.allowedPages
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      await api.put(`/users/${selectedUser._id || selectedUser.id}`, payload);
      alert('User Account & Page Access Permissions Updated Successfully!');
      setIsEditModalOpen(false);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to update user', error);
      alert(error.response?.data?.message || 'Failed to update user permissions');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveStatus = async (user) => {
    try {
      await api.put(`/users/${user._id || user.id}`, { status: 'Active' });
      fetchInitialData();
    } catch (error) {
      console.error('Failed to approve user', error);
      alert('Failed to approve user');
    }
  };

  const handleDeactivate = async (user) => {
    if (!window.confirm(`Are you sure you want to deactivate ${user.name}?`)) return;
    try {
      await api.delete(`/users/${user._id || user.id}`);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to deactivate user', error);
      alert('Failed to deactivate user');
    }
  };

  // Group system pages for visual organized checkbox layout
  const pagesByGroup = ALL_SYSTEM_PAGES.reduce((acc, page) => {
    if (!acc[page.group]) acc[page.group] = [];
    acc[page.group].push(page);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 font-display flex items-center gap-2">
            <Users className="text-[var(--color-primary)]" size={26} />
            Users & Page Access Control
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage employee system roles, passwords, and name-wise page viewing permissions.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-4 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(216,27,96,0.3)] font-bold text-xs cursor-pointer shrink-0"
        >
          <Plus size={16} /> Add New User
        </button>
      </div>

      {/* Roles Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {SYSTEM_ROLES.map((roleName, idx) => {
          const userCount = users.filter(u => {
            const r = typeof u.role === 'object' ? u.role?.name : u.role;
            return r === roleName;
          }).length;

          return (
            <div key={idx} className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-950 uppercase tracking-wider">{roleName}</span>
                <ShieldCheck size={16} className="text-rose-600" />
              </div>
              <div className="text-xl font-bold font-mono text-gray-900">{userCount} Users</div>
              <div className="text-[10px] text-gray-500 font-semibold">
                {DEFAULT_ROLE_PERMISSIONS[roleName]?.length || 0} Pages Allowed
              </div>
            </div>
          );
        })}
      </div>

      {/* Users Table */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-600 flex justify-center items-center gap-2">
            <span className="animate-spin text-rose-600">⌛</span> Loading Users & Permission Settings...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gradient-to-r from-pink-900 to-rose-950 text-white uppercase tracking-wider text-[11px] font-extrabold">
                <tr>
                  <th className="px-6 py-4">EMP ID</th>
                  <th className="px-6 py-4">Employee Name</th>
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4">System Role</th>
                  <th className="px-6 py-4 text-center">Allowed Pages Access</th>
                  <th className="px-6 py-4 text-center">Account Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/80 bg-white/40">
                {users.map((u) => {
                  const roleName = typeof u.role === 'object' ? (u.role?.name || 'User') : (u.role || 'User');
                  const allowedCount = Array.isArray(u.allowedPages) && u.allowedPages.length > 0 
                    ? u.allowedPages.length 
                    : (DEFAULT_ROLE_PERMISSIONS[roleName]?.length || 0);

                  const isSuperAdmin = roleName === 'Super Admin' || u.username === 'admin';

                  return (
                    <tr key={u._id || u.id} className="hover:bg-white/80 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-rose-900">{u.employeeId || 'N/A'}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {u.name}
                        <span className="block text-[11px] text-gray-400 font-normal">{u.email || 'No Email'}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-700">{u.username}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-600">
                        {u.primaryBranch ? (
                          typeof u.primaryBranch === 'object' ? `${u.primaryBranch.branchCode} - ${u.primaryBranch.city || u.primaryBranch.name}` : 'Assigned'
                        ) : 'Main Branch'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                          roleName === 'Super Admin' ? 'bg-purple-50 text-purple-900 border-purple-300' :
                          roleName === 'Purchase Team' ? 'bg-blue-50 text-blue-900 border-blue-300' :
                          roleName === 'QC Team' ? 'bg-amber-50 text-amber-900 border-amber-300' :
                          roleName === 'Production Team' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' :
                          'bg-rose-50 text-rose-900 border-rose-300'
                        }`}>
                          {roleName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-slate-100 text-slate-800 font-extrabold text-xs px-3 py-1 rounded-xl border border-slate-200">
                          {isSuperAdmin ? 'Full System Access (16/16)' : `${allowedCount} / 16 Pages`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          u.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          u.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {u.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          {u.status === 'Pending' && (
                            <button 
                              onClick={() => handleApproveStatus(u)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                          )}
                          
                          <button 
                            onClick={() => handleOpenEditModal(u)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs"
                            title="Edit Role & Page Access Permissions"
                          >
                            <Edit3 size={14} /> Access & Role
                          </button>

                          {u.status === 'Active' && u.username !== 'admin' && (
                            <button 
                              onClick={() => handleDeactivate(u)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Deactivate Account"
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500 font-semibold">
                      No user accounts found. Click "Add New User" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- CREATE NEW USER MODAL --- */}
      {isCreateModalOpen && (
        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Employee User Account" size="lg">
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Employee Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Username (for Login) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ramesh_purchase"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Set initial login password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Primary Assigned Branch</label>
                <select
                  value={formData.primaryBranch}
                  onChange={(e) => setFormData({ ...formData, primaryBranch: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-rose-500"
                >
                  {branches.map(b => (
                    <option key={b._id || b.id} value={b._id || b.id}>
                      {b.branchCode} - {b.city || b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Select Role Preset */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Select System Role Preset</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {SYSTEM_ROLES.map((r, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => handleRolePresetSelect(r)}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-all text-center cursor-pointer ${
                      formData.role === r 
                        ? 'bg-rose-950 text-white border-rose-950 shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-rose-50 border-gray-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Page Access Checkboxes */}
            <div className="space-y-3 border-t border-gray-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-rose-950 uppercase tracking-wider">
                  Page Viewing & Access Permissions ({formData.allowedPages.length} Selected)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllPages}
                    className="text-[11px] font-bold text-rose-600 hover:underline"
                  >
                    Select All Pages
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllPages}
                    className="text-[11px] font-bold text-gray-500 hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                {Object.keys(pagesByGroup).map((groupName, gIdx) => (
                  <div key={gIdx} className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                    <div className="text-[11px] font-black text-rose-900 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
                      {groupName}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {pagesByGroup[groupName].map((page, pIdx) => {
                        const isChecked = formData.allowedPages.includes(page.path);
                        return (
                          <label key={pIdx} className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer bg-white p-2 rounded-xl border border-gray-200 hover:border-rose-400">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePagePermission(page.path)}
                              className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                            />
                            <span>{page.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
              >
                {submitting ? 'Creating Account...' : 'Create Account & Grant Access'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- EDIT USER ROLE & PERMISSIONS MODAL --- */}
      {isEditModalOpen && selectedUser && (
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Configure Role & Permissions: ${selectedUser.name}`} size="lg">
          <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto p-1 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Employee Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Username (Login ID)</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reset Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep unchanged"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Account Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-rose-500"
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending Approval</option>
                  <option value="Inactive">Inactive / Suspended</option>
                </select>
              </div>
            </div>

            {/* Select Role Preset */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Assign System Role</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {SYSTEM_ROLES.map((r, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => handleRolePresetSelect(r)}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-all text-center cursor-pointer ${
                      formData.role === r 
                        ? 'bg-rose-950 text-white border-rose-950 shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-rose-50 border-gray-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Page Access Checkboxes */}
            <div className="space-y-3 border-t border-gray-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-rose-950 uppercase tracking-wider">
                  Page Viewing & Access Permissions for {formData.name} ({formData.allowedPages.length} Pages Allowed)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllPages}
                    className="text-[11px] font-bold text-rose-600 hover:underline"
                  >
                    Select All Pages
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllPages}
                    className="text-[11px] font-bold text-gray-500 hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                {Object.keys(pagesByGroup).map((groupName, gIdx) => (
                  <div key={gIdx} className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                    <div className="text-[11px] font-black text-rose-900 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
                      {groupName}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {pagesByGroup[groupName].map((page, pIdx) => {
                        const isChecked = formData.allowedPages.includes(page.path);
                        return (
                          <label key={pIdx} className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer bg-white p-2 rounded-xl border border-gray-200 hover:border-rose-400">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePagePermission(page.path)}
                              className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                            />
                            <span>{page.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
              >
                {submitting ? 'Saving Permissions...' : 'Save User Access Permissions'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default UsersList;
