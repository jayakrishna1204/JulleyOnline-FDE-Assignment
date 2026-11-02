import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setApiTenantId } from '../services/api';
import { initSocketClient, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load organizations and tenants when authenticated
  useEffect(() => {
    if (token) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      const currentUser = res.data.user;
      setUser(currentUser);
      localStorage.setItem('user', JSON.stringify(currentUser));

      // Fetch organizations
      const orgRes = await api.get('/organizations');
      const orgs = orgRes.data.data;
      setOrganizations(orgs);

      // Determine default organization
      let activeOrg = orgs[0] || null;
      const savedOrgId = localStorage.getItem('selectedOrgId');
      if (savedOrgId && orgs.some((o) => o.id === savedOrgId)) {
        activeOrg = orgs.find((o) => o.id === savedOrgId);
      }
      setSelectedOrg(activeOrg);

      if (activeOrg) {
        await loadTenantsForOrg(activeOrg.id, currentUser);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const loadTenantsForOrg = async (orgId, currentUser) => {
    try {
      const tenantRes = await api.get(`/tenants?organizationId=${orgId}`);
      const branchTenants = tenantRes.data.data;
      setTenants(branchTenants);

      let activeTenant = branchTenants[0] || null;
      const savedTenantId = localStorage.getItem('selectedTenantId');
      if (savedTenantId && branchTenants.some((t) => t.id === savedTenantId)) {
        activeTenant = branchTenants.find((t) => t.id === savedTenantId);
      }

      setSelectedTenant(activeTenant);
      if (activeTenant) {
        setApiTenantId(activeTenant.id);
        localStorage.setItem('selectedTenantId', activeTenant.id);
      }
    } catch (err) {
      console.error('Failed to load tenants for org:', err);
    }
  };

  const login = async (email, password) => {
    // Clear any previous stale tenant state before authenticating new user
    setApiTenantId(null);
    localStorage.removeItem('selectedTenantId');
    localStorage.removeItem('selectedOrgId');

    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    // Initialize socket connection
    initSocketClient(newToken);

    return newUser;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    const { token: newToken, user: newUser } = res.data;

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    initSocketClient(newToken);
    return newUser;
  };

  const logout = () => {
    disconnectSocket();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedOrgId');
    localStorage.removeItem('selectedTenantId');
    setToken(null);
    setUser(null);
    setOrganizations([]);
    setSelectedOrg(null);
    setTenants([]);
    setSelectedTenant(null);
    setApiTenantId(null);
  };

  const switchOrganization = async (orgId) => {
    const org = organizations.find((o) => o.id === orgId);
    if (!org) return;

    setSelectedOrg(org);
    localStorage.setItem('selectedOrgId', org.id);
    await loadTenantsForOrg(org.id, user);
  };

  const switchTenant = (tenantId) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) return;

    setSelectedTenant(tenant);
    setApiTenantId(tenant.id);
    localStorage.setItem('selectedTenantId', tenant.id);
  };

  // Determine user's active role in currently selected tenant
  const getCurrentRole = () => {
    if (!user || !selectedTenant) return 'Member';

    // Direct membership in tenant
    const direct = user.memberships?.find((m) => m.tenantId === selectedTenant.id);
    if (direct) return direct.role;

    // Org Admin in parent organization
    const orgAdmin = user.memberships?.find(
      (m) => m.organizationId === selectedTenant.organizationId && m.role === 'Org Admin'
    );
    if (orgAdmin) return 'Org Admin';

    return 'Member';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        organizations,
        selectedOrg,
        tenants,
        selectedTenant,
        currentRole: getCurrentRole(),
        login,
        register,
        logout,
        switchOrganization,
        switchTenant,
        refreshUserData: loadUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
