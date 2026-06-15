'use client'

import React, { useState } from 'react'
import { ChatProvider, useChat } from '@/context/ChatContext'
import Sidebar from '@/components/Sidebar'
import SettingsModal from '@/components/SettingsModal'
import { Menu, X } from 'lucide-react'

function SettingsModalWrapper() {
  const { isSettingsOpen, setIsSettingsOpen } = useChat()
  if (!isSettingsOpen) return null
  return <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
}

function ChatLayoutContent({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { desktopSidebarOpen, setDesktopSidebarOpen } = useChat()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Desktop Sidebar (visible on md and larger when open) */}
      {desktopSidebarOpen && (
        <div className="hidden md:flex md:w-72 md:flex-col md:border-r md:border-border/60 bg-card transition-all duration-300">
          <Sidebar onClose={() => {}} />
        </div>
      )}

      {/* Mobile Sidebar (drawer overlay) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-background/60 backdrop-blur-sm animate-fade-in">
          {/* Click outside to close */}
          <div className="absolute inset-0" onClick={() => setMobileMenuOpen(false)} />
          
          <div className="w-72 h-full border-r border-border/60 bg-card shadow-2xl relative flex flex-col">
            <Sidebar onClose={() => setMobileMenuOpen(false)} />
            {/* Close Button Inside Sidebar for Mobile */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col h-full overflow-hidden relative">
        {/* Open Sidebar Button (visible on desktop when sidebar is collapsed) */}
        {!desktopSidebarOpen && (
          <button
            onClick={() => setDesktopSidebarOpen(true)}
            className="hidden md:flex absolute top-[14px] left-4 p-1.5 rounded-lg border border-border/60 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer z-40"
            title="Expand Sidebar"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
        )}

        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-border/60 bg-card/60 backdrop-blur-md z-25">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground transition-all cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm tracking-tight text-primary">Saathi</span>
          <div className="w-8 h-8" /> {/* Spacer to center name */}
        </header>

        <main className="flex-1 h-full overflow-hidden relative flex flex-col bg-background/50">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <ChatLayoutContent>{children}</ChatLayoutContent>
      <SettingsModalWrapper />
    </ChatProvider>
  )
}
