"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

import Sidebar from "../Sidebar/Sidebar";
import { ChatProvider } from "@/context/chat-context";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({
  children,
}: AppShellProps) {
  const pathname = usePathname();

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register";

  // Login/Register par Sidebar aur ChatProvider nahi chahiye
  if (isAuthPage) {
    return <>{children}</>;
  }
  return (
    <ChatProvider>
      <div className="flex h-screen overflow-hidden bg-zinc-950 text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </ChatProvider>
  );
}