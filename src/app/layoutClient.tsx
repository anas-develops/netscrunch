"use client";

import { ReactNode, use, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ClipboardList,
  Menu,
  Power,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LayoutClient({
  user,
  profile,
  children,
}: {
  user: User;
  profile: { full_name: string; role: string };
  children: ReactNode;
}) {
  const supabaseClient = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.refresh(); // or router.push('/login');
  };

  const navItems = [
    { name: "Leads", href: "/leads", icon: Users, exact: false },
    { name: "Deals", href: "/deals", icon: Briefcase, exact: false },
    { name: "My Tasks", href: "/tasks", icon: ClipboardList, exact: false },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      exact: false,
    },
  ];

  // Get current path for active state
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-800">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:z-0`}
      >
        <div className="p-4">
          <h1 className="text-xl font-bold text-red-500">NetScrunch</h1>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-2 rounded ${
                  isActive
                    ? "bg-gray-800 text-gray-200 font-medium"
                    : "text-gray-500 hover:bg-gray-700 hover:text-gray-300"
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        <header className="bg-gray-900 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-400"
          >
            <Menu size={20} />
          </button>

          <div className="ml-auto flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                {(profile.full_name && profile.full_name.charAt(0)
                  ? profile.full_name.charAt(0)
                  : user.email && user.email.charAt(0)
                  ? user.email.charAt(0)
                  : ""
                ).toUpperCase()}
              </div>
              <span className="text-gray-200 hidden md:inline">
                {profile.full_name || user.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 cursor-pointer hover:text-red-400"
              title="Logout"
            >
              <Power size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
