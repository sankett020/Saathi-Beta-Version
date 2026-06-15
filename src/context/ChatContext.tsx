'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export interface Chat {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface ChatContextType {
  chats: Chat[]
  loading: boolean
  user: User | null
  activeChatId: string | null
  theme: 'light' | 'dark'
  toggleTheme: () => void
  createChat: (title?: string) => Promise<string | null>
  deleteChat: (id: string) => Promise<void>
  renameChat: (id: string, title: string) => Promise<void>
  logout: () => Promise<void>
  fetchChats: () => Promise<void>
  sessionId: string
  isSettingsOpen: boolean
  setIsSettingsOpen: (open: boolean) => void
  desktopSidebarOpen: boolean
  setDesktopSidebarOpen: (open: boolean) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [sessionId, setSessionId] = useState<string>('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  // Track the active chat ID from the URL params if present
  const activeChatId = (params?.id as string) || null

  // Generate a unique session ID for session metrics and persist in sessionStorage
  useEffect(() => {
    let savedSessionId = sessionStorage.getItem('saathi_session_id')
    if (!savedSessionId) {
      savedSessionId = Math.random().toString(36).substring(2, 15)
      sessionStorage.setItem('saathi_session_id', savedSessionId)
    }
    setSessionId(savedSessionId)
  }, [])

  // Persistently track session duration in database (heartbeat upsert every 10 seconds)
  useEffect(() => {
    if (!user || !sessionId) return

    let elapsedSeconds = 0
    
    const registerSessionStart = async () => {
      try {
        const { data: existing } = await supabase
          .from('user_sessions')
          .select('duration_seconds')
          .eq('session_id', sessionId)
          .maybeSingle()

        if (existing) {
          elapsedSeconds = existing.duration_seconds || 0
          await supabase.from('user_sessions').update({
            last_active_at: new Date().toISOString()
          }).eq('session_id', sessionId)
        } else {
          await supabase.from('user_sessions').insert({
            user_id: user.id,
            session_id: sessionId,
            started_at: new Date().toISOString(),
            last_active_at: new Date().toISOString(),
            duration_seconds: 0
          })
        }
      } catch (err) {
        console.error('Failed to register or retrieve session start:', err)
      }
    }

    registerSessionStart()

    const interval = setInterval(async () => {
      elapsedSeconds += 10
      try {
        await supabase.from('user_sessions').upsert({
          user_id: user.id,
          session_id: sessionId,
          last_active_at: new Date().toISOString(),
          duration_seconds: elapsedSeconds
        }, {
          onConflict: 'session_id'
        })
      } catch (err) {
        console.error('Failed to update session duration:', err)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [user, sessionId])

  // Initialize theme from localStorage or system preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
      if (savedTheme === 'dark') document.documentElement.classList.add('dark')
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const defaultTheme = systemDark ? 'dark' : 'light'
      setTheme(defaultTheme)
      if (defaultTheme === 'dark') document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    // Track theme change
    trackEvent('theme_toggled', { theme: nextTheme })
  }

  // Get current user and load their chats
  useEffect(() => {
    const getUserAndChats = async () => {
      setLoading(true)
      try {
        // Try getting session from memory/local storage first (instant local check)
        const { data: { session } } = await supabase.auth.getSession()
        let currentUser = session?.user || null

        // Verify with server only if no local session exists
        if (!currentUser) {
          const { data: { user } } = await supabase.auth.getUser()
          currentUser = user
        }

        setUser(currentUser)

        if (currentUser) {
          // Fetch chats sorted by updated_at descending
          const { data: chatsData, error } = await supabase
            .from('chats')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('updated_at', { ascending: false })

          if (!error && chatsData) {
            setChats(chatsData)
          }

          // Track session start
          trackEvent('session_start', { email: currentUser.email })
        }
      } catch (err) {
        console.error('Error in getUserAndChats:', err)
      } finally {
        setLoading(false)
      }
    }

    getUserAndChats()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        const { data: chatsData } = await supabase
          .from('chats')
          .select('*')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false })
        if (chatsData) setChats(chatsData)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setChats([])
        router.push('/')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const fetchChats = async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setChats(data)
    }
  }

  // Track analytics event locally in Supabase
  const trackEvent = async (eventType: string, eventData: any = {}) => {
    if (!user && eventType !== 'session_start') return
    try {
      await supabase.from('analytics_events').insert({
        user_id: user?.id || null,
        session_id: sessionId || 'temp-session',
        event_type: eventType,
        event_data: eventData,
      })
    } catch (e) {
      console.error('Analytics tracking failed', e)
    }
  }

  const createChat = async (title = 'New Chat') => {
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          title,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setChats((prev) => [data, ...prev])
        trackEvent('chat_created', { chat_id: data.id })
        router.push(`/chat/${data.id}`)
        return data.id
      }
    } catch (err: any) {
      console.error('Error creating chat:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        error: err
      })
      alert(`Could not create chat. Database Error: ${err.message || 'Unknown database error'}. Details: ${err.details || 'None'}. Make sure you have run the database setup script (schema.sql) in your Supabase SQL Editor to create the tables.`)
    }
    return null
  }

  const deleteChat = async (id: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', id)

      if (error) throw error

      setChats((prev) => prev.filter((chat) => chat.id !== id))
      trackEvent('chat_deleted', { chat_id: id })

      // If we deleted the active chat, redirect to general chat screen
      if (activeChatId === id) {
        router.push('/chat')
      }
    } catch (err: any) {
      console.error('Error deleting chat:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        error: err
      })
      alert(`Could not delete chat: ${err.message || 'Unknown database error'}`)
    }
  }

  const renameChat = async (id: string, newTitle: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('chats')
        .update({ title: newTitle })
        .eq('id', id)

      if (error) throw error

      setChats((prev) =>
        prev.map((chat) => (chat.id === id ? { ...chat, title: newTitle } : chat))
      )
      trackEvent('chat_renamed', { chat_id: id, new_title: newTitle })
    } catch (err: any) {
      console.error('Error renaming chat:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        error: err
      })
      alert(`Could not rename chat: ${err.message || 'Unknown database error'}`)
    }
  }

  const logout = async () => {
    await trackEvent('user_logout')
    await supabase.auth.signOut()
    setUser(null)
    setChats([])
    router.push('/')
  }

  return (
    <ChatContext.Provider
      value={{
        chats,
        loading,
        user,
        activeChatId,
        theme,
        toggleTheme,
        createChat,
        deleteChat,
        renameChat,
        logout,
        fetchChats,
        sessionId,
        isSettingsOpen,
        setIsSettingsOpen,
        desktopSidebarOpen,
        setDesktopSidebarOpen,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
