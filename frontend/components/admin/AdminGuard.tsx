import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const AdminGuard = () => {
    // Check for the specific local storage key required by the spec
    const isAuthenticated = localStorage.getItem('dr_admin_auth') === 'true';

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Render the nested admin components (AdminLayout)
    return <Outlet />;
};
