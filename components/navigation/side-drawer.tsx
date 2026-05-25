'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  LayoutGrid,
  UtensilsCrossed,
  Users,
  Package,
  BarChart3,
  ShoppingCart,
  CreditCard,
  Receipt,
  IndianRupee,
  FileText,
  ClipboardList,
  LogOut,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { MENU_ITEMS } from '@/lib/constants';
import { Button } from '@/components/ui/button';

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={20} />,
  LayoutGrid: <LayoutGrid size={20} />,
  UtensilsCrossed: <UtensilsCrossed size={20} />,
  Users: <Users size={20} />,
  Package: <Package size={20} />,
  BarChart3: <BarChart3 size={20} />,
  ShoppingCart: <ShoppingCart size={20} />,
  CreditCard: <CreditCard size={20} />,
  Receipt: <Receipt size={20} />,
  IndianRupee: <IndianRupee size={20} />,
  FileText: <FileText size={20} />,
  ClipboardList: <ClipboardList size={20} />,
  TrendingDown: <TrendingDown size={20} />,
};

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SideDrawer({ isOpen, onClose }: SideDrawerProps) {
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!user) return null;

  const menuItems = MENU_ITEMS[user.role];

  const handleLogout = () => {
    logout();
    onClose();
    router.push('/');
  };

  return (
    <>
      {/* Mobile Drawer */}
      <div
        className={`fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed left-0 top-16 bottom-0 w-64 bg-sidebar text-sidebar-foreground shadow-lg z-30 md:hidden transition-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  >
                    {ICON_MAP[item.icon] || null}
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-sidebar-border p-4 space-y-2">
            <div className="px-4 py-2 text-sm font-medium">{user.name}</div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut size={18} />
              <span className="ml-2">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-col">
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  {ICON_MAP[item.icon] || null}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-4 space-y-2">
          <div className="px-4 py-2 text-sm font-medium">{user.name}</div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut size={18} />
            <span className="ml-2">Logout</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
