import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const Layout = () => {
    return (
        <div className="flex h-screen w-full bg-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                <Outlet />
            </div>
        </div>
    );
};