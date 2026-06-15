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

function DeleteConfirmModalWrapper() {
  const { deleteConfirmId, setDeleteConfirmId, deleteChat } = useChat()
  if (!deleteConfirmId) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4"
      onClick={() => setDeleteConfirmId(null)}
    >
      <div 
        className="w-full max-w-md rounded-2xl border border-border bg-card/95 backdrop-blur-md p-6 shadow-2xl transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground">
          Delete chat?
        </h3>
        <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
          This will delete prompts, responses and feedback from your Saathi Apps activity, plus any content that you created.
        </p>
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            onClick={() => setDeleteConfirmId(null)}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              const id = deleteConfirmId
              setDeleteConfirmId(null)
              await deleteChat(id)
            }}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95 transition-all cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function ChatLayoutContent({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { desktopSidebarOpen, setDesktopSidebarOpen } = useChat()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-rose-500/5 via-amber-500/5 to-violet-500/10 dark:from-rose-950/20 dark:via-amber-950/10 dark:to-violet-950/20 text-foreground font-sans relative">
      {/* Heart-warming background glowing pulsing orbs */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/6 left-1/4 w-[450px] h-[450px] rounded-full bg-rose-400/15 dark:bg-rose-900/10 blur-3xl pointer-events-none animate-pulse duration-10000" />
        <div className="absolute bottom-1/6 right-1/4 w-[550px] h-[550px] rounded-full bg-amber-300/10 dark:bg-amber-800/5 blur-3xl pointer-events-none animate-pulse duration-8000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-400/8 dark:bg-violet-950/5 blur-3xl pointer-events-none animate-pulse duration-12000" />
      </div>

      {/* Desktop Sidebar (visible on md and larger when open) */}
      {desktopSidebarOpen && (
        <div className="hidden md:flex md:w-72 md:flex-col md:border-r md:border-border/60 bg-card/40 backdrop-blur-md transition-all duration-300 relative z-10">
          <Sidebar onClose={() => {}} />
        </div>
      )}

      {/* Mobile Sidebar (drawer overlay) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-background/60 backdrop-blur-sm animate-fade-in">
          {/* Click outside to close */}
          <div className="absolute inset-0" onClick={() => setMobileMenuOpen(false)} />
          
          <div className="w-72 h-full border-r border-border/60 bg-card shadow-2xl relative flex flex-col z-50">
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
      <div className="flex flex-1 flex-col h-full overflow-hidden relative z-10">
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

        <main className="flex-1 h-full overflow-hidden relative flex flex-col bg-background/20 backdrop-blur-xs">
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
      <DeleteConfirmModalWrapper />
    </ChatProvider>
  )
}
