'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Users,
  CreditCard,
  Building2,
  KeyRound,
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  DollarSign,
  Calendar,
  LogOut,
  Eye,
  EyeOff,
  ChefHat,
  ArrowUpRight,
  Receipt,
  X,
} from 'lucide-react';
import Link from 'next/link';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'KITCHEN';
  restaurantId: string | null;
  restaurant?: { id: string; name: string; slug: string } | null;
  restaurants?: Array<{ id: string; name: string; slug: string }>;
  createdAt: string;
  updatedAt: string;
}

interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  subscriptionStatus: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED';
  subscriptionPlan: string;
  monthlyFee: number;
  renewalDate: string | null;
  isActive: boolean;
  currencySymbol: string;
  user?: { id: string; email: string; name: string };
  staff?: Array<{ id: string; email: string; name: string; role: string }>;
  _count: {
    tables: number;
    orders: number;
    menuItems: number;
    categories: number;
  };
  createdAt: string;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'USERS' | 'SUBSCRIPTIONS' | 'ORDERS'>('USERS');

  // Users state
  const [users, setUsers] = useState<UserData[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<UserData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // Edit User Form state
  const [editFormEmail, setEditFormEmail] = useState('');
  const [editFormName, setEditFormName] = useState('');
  const [editFormRole, setEditFormRole] = useState<'SUPERADMIN' | 'ADMIN' | 'KITCHEN'>('ADMIN');
  const [editFormRestaurantId, setEditFormRestaurantId] = useState('');
  const [editFormNewPassword, setEditFormNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userModalMessage, setUserModalMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New User Form state
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'SUPERADMIN' | 'ADMIN' | 'KITCHEN'>('ADMIN');
  const [newRestaurantId, setNewRestaurantId] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Subscriptions & Restaurants state
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [subscriptionSummary, setSubscriptionSummary] = useState<any>(null);
  const [isUpdatingSub, setIsUpdatingSub] = useState<string | null>(null);

  // Live Orders state
  const [platformOrders, setPlatformOrders] = useState<any[]>([]);

  // 1. Auth check
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/admin/login');
          return;
        }
        const data = await res.json();
        if (!data.authenticated || data.user?.role !== 'SUPERADMIN') {
          alert('Access restricted: Super Admin role required.');
          router.push('/admin/login');
          return;
        }
        setCurrentUser(data.user);
      } catch {
        router.push('/admin/login');
      }
    }
    checkAuth();
  }, [router]);

  // 2. Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  }, []);

  // 3. Fetch Restaurants & Subscriptions
  const fetchRestaurants = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/restaurants');
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data.restaurants || []);
        setSubscriptionSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Fetch restaurants error:', err);
    }
  }, []);

  // 4. Fetch Platform Orders
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setPlatformOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchRestaurants(), fetchOrders()]);
    setLoading(false);
  }, [fetchUsers, fetchRestaurants, fetchOrders]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Open edit modal for user
  const handleOpenEditUser = (u: UserData) => {
    setSelectedUserToEdit(u);
    setEditFormEmail(u.email);
    setEditFormName(u.name);
    setEditFormRole(u.role);
    setEditFormRestaurantId(u.restaurantId || u.restaurants?.[0]?.id || '');
    setEditFormNewPassword('');
    setShowPassword(false);
    setUserModalMessage(null);
    setIsEditModalOpen(true);
  };

  // Submit User ID & Password Change
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToEdit) return;

    setIsSavingUser(true);
    setUserModalMessage(null);

    try {
      const body: any = {
        userId: selectedUserToEdit.id,
        email: editFormEmail.trim(),
        name: editFormName.trim(),
        role: editFormRole,
        restaurantId: editFormRestaurantId || null,
      };

      if (editFormNewPassword.trim()) {
        body.newPassword = editFormNewPassword.trim();
      }

      const res = await fetch('/api/superadmin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      setUserModalMessage({
        text: `✓ User ${data.user.email} updated successfully! ${data.passwordChanged ? 'Password was also updated.' : ''}`,
        type: 'success',
      });

      await fetchUsers();
      setTimeout(() => {
        setIsEditModalOpen(false);
        setUserModalMessage(null);
      }, 1200);
    } catch (err: any) {
      setUserModalMessage({ text: err.message || 'Error updating user', type: 'error' });
    } finally {
      setIsSavingUser(false);
    }
  };

  // Submit Create New User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);

    try {
      const res = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim(),
          name: newName.trim(),
          password: newPassword.trim(),
          role: newRole,
          restaurantId: newRestaurantId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      alert(`User ${data.user.email} created successfully!`);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setIsAddUserModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Error creating user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (user: UserData) => {
    if (!confirm(`Are you sure you want to permanently delete user: ${user.email} (${user.name})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/superadmin/users?userId=${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      alert('User deleted successfully');
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Error deleting user');
    }
  };

  // Update subscription status or extend by 30 days
  const handleExtendSubscription = async (restaurant: RestaurantData) => {
    try {
      setIsUpdatingSub(restaurant.id);
      const currentRenewal = restaurant.renewalDate ? new Date(restaurant.renewalDate) : new Date();
      const newRenewal = new Date(currentRenewal);
      newRenewal.setDate(newRenewal.getDate() + 30);

      const res = await fetch('/api/superadmin/restaurants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          subscriptionStatus: 'ACTIVE',
          renewalDate: newRenewal.toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend subscription');
      alert(`Subscription for ${restaurant.name} extended by 30 days until ${newRenewal.toLocaleDateString()}!`);
      await fetchRestaurants();
    } catch (err: any) {
      alert(err.message || 'Error extending subscription');
    } finally {
      setIsUpdatingSub(null);
    }
  };

  // Toggle restaurant active status or subscription
  const handleToggleSubscriptionStatus = async (restaurant: RestaurantData, newStatus: string) => {
    try {
      setIsUpdatingSub(restaurant.id);
      const res = await fetch('/api/superadmin/restaurants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          subscriptionStatus: newStatus,
        }),
      });

      if (!res.ok) throw new Error('Failed to update status');
      await fetchRestaurants();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setIsUpdatingSub(null);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  // Filtered users
  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Super Admin Navigation Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">
                  MOMO MENU
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 uppercase tracking-widest flex items-center gap-1">
                  <span>👑 SUPER ADMIN</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Master SaaS Platform Control • Logged in: <strong className="text-amber-300">{currentUser?.email}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Owner Admin</span>
            </Link>

            <Link
              href="/kitchen/orders"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition"
            >
              <ChefHat className="w-4 h-4 text-emerald-400" />
              <span>Kitchen Station</span>
            </Link>

            <button
              onClick={refreshAll}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 text-xs font-bold transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* SaaS Performance KPI Metrics Bar */}
      <section className="bg-slate-900/60 border-b border-slate-800/80 px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Total Restaurants</span>
              <Building2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {restaurants.length}
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-1">
              Active SaaS Tenants
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Monthly Subscription Rev</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              ₹{subscriptionSummary?.estimatedMonthlyRevenue?.toLocaleString() || 999}
              <span className="text-xs text-slate-400 font-normal"> /mo</span>
            </div>
            <div className="text-[11px] text-slate-400 font-semibold mt-1">
              Recurring SaaS billing
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Total System Users</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {users.length}
            </div>
            <div className="text-[11px] text-blue-300 font-semibold mt-1">
              Admins, Kitchen & Superadmins
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Platform Orders</span>
              <Receipt className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-300">
              {platformOrders.length}
            </div>
            <div className="text-[11px] text-purple-400 font-semibold mt-1">
              Live orders in database
            </div>
          </div>
        </div>
      </section>

      {/* Main Tabs Navigation */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-8 flex-1 flex flex-col">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
          <button
            onClick={() => setActiveTab('USERS')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition ${
              activeTab === 'USERS'
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Universal User & Password Manager ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SUBSCRIPTIONS')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition ${
              activeTab === 'SUBSCRIPTIONS'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Restaurant Subscriptions ({restaurants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition ${
              activeTab === 'ORDERS'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Platform Live Orders ({platformOrders.length})</span>
          </button>
        </div>

        {/* TAB 1: UNIVERSAL USER & PASSWORD MANAGER */}
        {activeTab === 'USERS' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New User</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-4">User / Name</th>
                      <th className="px-5 py-4">Email (Login ID)</th>
                      <th className="px-5 py-4">System Role</th>
                      <th className="px-5 py-4">Assigned Restaurant</th>
                      <th className="px-5 py-4">Created Date</th>
                      <th className="px-5 py-4 text-right">Super Admin Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredUsers.map((u) => {
                      const isSuper = u.role === 'SUPERADMIN';
                      const isKitchen = u.role === 'KITCHEN';
                      const isAdmin = u.role === 'ADMIN';

                      const assignedRestName =
                        u.restaurant?.name ||
                        (u.restaurants && u.restaurants.length > 0 ? u.restaurants[0].name : 'All / None');

                      return (
                        <tr key={u.id} className="hover:bg-slate-800/50 transition">
                          <td className="px-5 py-4">
                            <div className="font-extrabold text-white text-sm">
                              {u.name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              ID: {u.id.substring(0, 10)}...
                            </div>
                          </td>

                          <td className="px-5 py-4 font-mono font-medium text-slate-200">
                            {u.email}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                isSuper
                                  ? 'bg-amber-500 text-slate-950'
                                  : isKitchen
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-slate-300">
                            <div className="flex items-center gap-1.5 font-medium">
                              <Building2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>{assignedRestName}</span>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-slate-400">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Change ID & Password Button */}
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 rounded-xl font-bold text-xs transition"
                                title="Change ID or Password"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Change ID / Password</span>
                              </button>

                              {/* Delete (Cannot delete oneself) */}
                              {u.id !== currentUser?.id && (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 rounded-xl bg-red-950/40 hover:bg-red-900 border border-red-800 text-red-400 transition"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RESTAURANTS & MONTHLY SUBSCRIPTION MANAGEMENT */}
        {activeTab === 'SUBSCRIPTIONS' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-white text-base">
                  Tenant Restaurant Subscriptions (Monthly SaaS Model)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage active licenses, monthly subscription fees, and renew or extend restaurant access.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {restaurants.map((rest) => {
                const isActive = rest.subscriptionStatus === 'ACTIVE';
                const isExpired = rest.subscriptionStatus === 'EXPIRED';
                const isWorking = isUpdatingSub === rest.id;

                return (
                  <div
                    key={rest.id}
                    className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-black text-white">{rest.name}</h4>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                isActive
                                  ? 'bg-emerald-500 text-slate-950'
                                  : isExpired
                                  ? 'bg-red-500 text-white'
                                  : 'bg-amber-500 text-slate-950'
                              }`}
                            >
                              {rest.subscriptionStatus}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            Slug: /r/{rest.slug}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-xl font-black text-emerald-400">
                            ₹{rest.monthlyFee}
                          </span>
                          <span className="text-[11px] text-slate-400"> /month</span>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs text-slate-300">
                        <div>
                          <span className="text-slate-500 block text-[11px]">Owner Account</span>
                          <strong className="text-slate-200">{rest.user?.email || 'None'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Monthly Plan</span>
                          <strong className="text-slate-200">{rest.subscriptionPlan}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Renewal Date</span>
                          <strong className="text-slate-200">
                            {rest.renewalDate ? new Date(rest.renewalDate).toLocaleDateString() : 'N/A'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Active Tables</span>
                          <strong className="text-slate-200">{rest._count.tables} Tables ({rest._count.orders} orders)</strong>
                        </div>
                      </div>
                    </div>

                    {/* Subscription Action Buttons */}
                    <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleExtendSubscription(rest)}
                        disabled={isWorking}
                        className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Extend by 30 Days</span>
                      </button>

                      {isActive ? (
                        <button
                          onClick={() => handleToggleSubscriptionStatus(rest, 'EXPIRED')}
                          disabled={isWorking}
                          className="py-2 px-3 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-bold rounded-xl transition"
                        >
                          Mark Expired
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleSubscriptionStatus(rest, 'ACTIVE')}
                          disabled={isWorking}
                          className="py-2 px-3 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-xl transition"
                        >
                          Reactivate
                        </button>
                      )}

                      <Link
                        href={`/r/${rest.slug}/t/1`}
                        target="_blank"
                        className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1 transition"
                      >
                        <span>View Menu</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: PLATFORM LIVE ORDERS */}
        {activeTab === 'ORDERS' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-white text-base">
                  Master Platform Orders Radar
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Super Admin real-time view of customer orders placed across all restaurants.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-4">Order #</th>
                    <th className="px-5 py-4">Table</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Items Ordered</th>
                    <th className="px-5 py-4">Total Amount</th>
                    <th className="px-5 py-4">Time Placed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {platformOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-800/50 transition">
                      <td className="px-5 py-4 font-mono font-bold text-amber-400">
                        #{o.orderNumber}
                      </td>
                      <td className="px-5 py-4 font-bold text-white">
                        Table {o.tableNumber}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          o.status === 'PENDING'
                            ? 'bg-amber-500 text-slate-950'
                            : o.status === 'SERVED'
                            ? 'bg-emerald-600 text-white'
                            : o.status === 'COMPLETED'
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-blue-600 text-white'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {o.orderItems.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                      </td>
                      <td className="px-5 py-4 font-bold text-emerald-400">
                        ₹{o.total}
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: CHANGE ID & PASSWORD OF ANYONE (SUPER ADMIN MASTER) */}
      {isEditModalOpen && selectedUserToEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Change ID / Password
                </h3>
                <p className="text-xs text-slate-400">
                  Editing: <span className="text-amber-300 font-semibold">{selectedUserToEdit.name}</span> ({selectedUserToEdit.role})
                </p>
              </div>
            </div>

            {userModalMessage && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs font-bold border ${
                  userModalMessage.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                    : 'bg-red-950/80 border-red-700 text-red-300'
                }`}
              >
                {userModalMessage.text}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Login ID / Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editFormEmail}
                  onChange={(e) => setEditFormEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Full Name / Designation
                </label>
                <input
                  type="text"
                  required
                  value={editFormName}
                  onChange={(e) => setEditFormName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    System Role
                  </label>
                  <select
                    value={editFormRole}
                    onChange={(e) => setEditFormRole(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ADMIN">ADMIN (Restaurant Owner)</option>
                    <option value="KITCHEN">KITCHEN (Kitchen Staff)</option>
                    <option value="SUPERADMIN">SUPERADMIN (Master)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    Assigned Restaurant
                  </label>
                  <select
                    value={editFormRestaurantId}
                    onChange={(e) => setEditFormRestaurantId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">None / Platform Level</option>
                    {restaurants.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password Change Field */}
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase text-amber-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Set New Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomPass = 'MomoPass' + Math.floor(1000 + Math.random() * 9000);
                      setEditFormNewPassword(randomPass);
                      setShowPassword(true);
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold"
                  >
                    Generate Random
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Leave blank to keep existing password"
                    value={editFormNewPassword}
                    onChange={(e) => setEditFormNewPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Type a new password (min 6 chars) to reset this user's password immediately.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
                >
                  {isSavingUser ? 'Saving Changes...' : 'Save & Update Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW USER */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddUserModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Create New System User
                </h3>
                <p className="text-xs text-slate-400">
                  Provision an Owner, Kitchen Staff, or Super Admin account
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chef Sanjeev or Owner Rajesh"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Email (Login ID)
                </label>
                <input
                  type="email"
                  required
                  placeholder="user@restaurant.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="text"
                  required
                  placeholder="Initial Password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ADMIN">ADMIN (Restaurant Owner)</option>
                    <option value="KITCHEN">KITCHEN (Kitchen Staff)</option>
                    <option value="SUPERADMIN">SUPERADMIN (Platform Master)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    Assign Restaurant
                  </label>
                  <select
                    value={newRestaurantId}
                    onChange={(e) => setNewRestaurantId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">None / Platform Level</option>
                    {restaurants.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
                >
                  {isCreatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
