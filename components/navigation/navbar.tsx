'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/common/brand-logo';
import { SideDrawer } from './side-drawer';

export function Navbar() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setIsDrawerOpen(false);
  };

  if (!user) return null;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-primary text-primary-foreground z-40 md:hidden">
        <div className="flex items-center justify-between h-16 px-4">
          <BrandLogo href={`/${user.role}`} />
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="p-2 hover:bg-primary/90 rounded-md"
            aria-label="Toggle menu"
          >
            {isDrawerOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <div className="hidden md:fixed md:top-0 md:left-0 md:right-0 md:bg-primary md:text-primary-foreground md:z-40 md:flex md:items-center md:justify-between md:h-16 md:px-8">
        <BrandLogo href={`/${user.role}`} />
        <div className="flex items-center gap-4">
          <span className="text-sm">{user.name}</span>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-primary/90"
          >
            <LogOut size={18} />
            <span className="ml-2">Logout</span>
          </Button>
        </div>
      </div>

      <SideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
