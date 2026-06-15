'use client'

import React, { useState } from 'react'
import { useChat } from '@/context/ChatContext'
import {
  Heart,
  Plus,
  MessageSquare,
  Pencil,
  Trash2,
  Check,
  X,
  Sun,
  Moon,
  Settings,
  LogOut,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

interface SidebarProps {
  onClose: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const {
    chats,
    loading,
    activeChatId,
    theme,
    toggleTheme,
    createChat,
    deleteChat,
    renameChat,
    logout,
    user,
    isSettingsOpen,
    setIsSettingsOpen
  } = useChat()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreateChat = async () => {
    setCreating(true)
    await createChat()
    setCreating(false)
    onClose()
  }

  const startEditing = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingId(id)
    setEditTitle(currentTitle)
  }

  const cancelEditing = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingId(null)
    setEditTitle('')
  }

  const saveRename = async (id: string, e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (editTitle.trim() && editTitle !== chats.find(c => c.id === id)?.title) {
      await renameChat(id, editTitle.trim())
    }
    setEditingId(null)
    setEditTitle('')
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this conversation?')) {
      await deleteChat(id)
    }
  }

  return (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-md border-r border-border/10 p-4">
      {/* Sidebar Header */}
      <div className="flex items-center gap-3 px-2 py-4 mb-2">
        <div className="flex items-center justify-center w-8 h-8">
          <img src="/logo.png?v=2" alt="Saathi Logo" className="w-full h-full object-contain" />
        </div>
        <Link href="/chat" onClick={onClose} className="font-semibold text-lg tracking-tight hover:text-primary transition-colors">
          Saathi
        </Link>
      </div>

      {/* New Chat Button */}
      <button
        onClick={handleCreateChat}
        disabled={creating}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-95 transition-all shadow-sm shadow-primary/10 active:scale-98 cursor-pointer disabled:opacity-50 disabled:scale-100"
      >
        {creating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        New Chat
      </button>

      {/* Chats List */}
      <div className="flex-1 overflow-y-auto my-4 space-y-1 pr-1">
        <h3 className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase px-2 mb-2">
          Conversations
        </h3>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="w-5 h-5 text-muted-foreground/50 animate-spin" />
            <span className="text-xs text-muted-foreground/50">Loading chats...</span>
          </div>
        ) : chats.length === 0 ? (
          <div className="text-xs text-muted-foreground/60 text-center py-8 px-4 leading-relaxed">
            No conversations yet. Create one above to begin.
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = activeChatId === chat.id
            const isEditing = editingId === chat.id

            return (
              <div
                key={chat.id}
                className={`group relative flex items-center w-full rounded-xl transition-all duration-200 border ${
                  isActive
                    ? 'bg-accent/40 border-primary/20 text-accent-foreground'
                    : 'border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {isEditing ? (
                  <form
                    onSubmit={(e) => saveRename(chat.id, e)}
                    className="flex items-center w-full gap-1 p-2"
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 text-xs px-2 py-1 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary text-foreground"
                      autoFocus
                      required
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      type="submit"
                      className="p-1 rounded-md hover:bg-emerald-500/10 text-emerald-500 transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="p-1 rounded-md hover:bg-red-500/10 text-red-500 transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <Link
                    href={`/chat/${chat.id}`}
                    onClick={onClose}
                    className="flex items-center gap-2.5 flex-1 px-3 py-2.5 text-sm font-medium overflow-hidden pr-18"
                  >
                    <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/60'}`} />
                    <span className="truncate pr-1 text-left">{chat.title}</span>
                  </Link>
                )}

                {/* Edit / Delete Buttons on Hover */}
                {!isEditing && (
                  <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity bg-gradient-to-l from-card hover:from-muted group-hover:from-muted pl-4 py-1.5 rounded-r-xl">
                    <button
                      onClick={(e) => startEditing(chat.id, chat.title, e)}
                      className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      title="Rename"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(chat.id, e)}
                      className="p-1 rounded hover:bg-background text-muted-foreground hover:text-red-500 transition-all cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="border-t border-border/60 pt-4 mt-auto space-y-3">
        <div className="flex items-center justify-between px-2">
          {/* User Email */}
          <div className="flex flex-col truncate max-w-32">
            <span className="text-xs font-semibold text-foreground truncate">
              {user?.email?.split('@')[0]}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {user?.email}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Settings Modal Toggle */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Settings & Analytics"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-border hover:bg-red-500/5 hover:text-red-500 text-muted-foreground font-medium text-xs transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log Out
        </button>
      </div>
    </div>
  )
}
