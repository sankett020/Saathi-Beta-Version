'use client'

import React, { useState, useEffect } from 'react'
import { useChat } from '@/context/ChatContext'
import { createClient } from '@/lib/supabase/client'
import {
  X,
  User,
  BarChart3,
  Heart,
  Clock,
  MessageCircle,
  FileText,
  Send,
  Loader2,
  Sparkles,
  Settings
} from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, sessionId, theme, toggleTheme } = useChat()
  const [activeTab, setActiveTab] = useState<'account' | 'analytics' | 'feedback'>('account')
  const supabase = createClient()

  // Analytics State
  const [stats, setStats] = useState({
    chatCount: 0,
    messageCount: 0,
    feedbackCount: 0,
    loading: false
  })
  
  // Session Duration Timer
  const [sessionSeconds, setSessionSeconds] = useState(0)

  // Feedback State
  const [rating, setRating] = useState<number>(5)
  const [feedbackText, setFeedbackText] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)

  // Timer for session duration
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Format seconds to mm:ss or hh:mm:ss
  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return [
      h > 0 ? String(h).padStart(2, '0') : null,
      String(m).padStart(2, '0'),
      String(s).padStart(2, '0')
    ].filter(Boolean).join(':')
  }

  // Fetch metrics when selecting analytics tab
  useEffect(() => {
    if (activeTab === 'analytics' && user) {
      const fetchAnalytics = async () => {
        setStats(prev => ({ ...prev, loading: true }))
        try {
          // Total Chats Count
          const { count: chatCount } = await supabase
            .from('chats')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

          // Total Messages Count
          const { data: userChats } = await supabase
            .from('chats')
            .select('id')
            .eq('user_id', user.id)

          let msgCount = 0
          if (userChats && userChats.length > 0) {
            const chatIds = userChats.map(c => c.id)
            const { count: messagesCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .in('chat_id', chatIds)
            
            msgCount = messagesCount || 0
          }

          // Feedback Count
          const { count: fCount } = await supabase
            .from('analytics_events')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('event_type', 'voluntary_feedback')

          setStats({
            chatCount: chatCount || 0,
            messageCount: msgCount || 0,
            feedbackCount: fCount || 0,
            loading: false
          })
        } catch (e) {
          console.error(e)
          setStats(prev => ({ ...prev, loading: false }))
        }
      }
      fetchAnalytics()
    }
  }, [activeTab, user, supabase])

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmittingFeedback(true)
    try {
      const { error } = await supabase.from('analytics_events').insert({
        user_id: user.id,
        session_id: sessionId,
        event_type: 'voluntary_feedback',
        event_data: {
          rating,
          comment: feedbackText,
          timestamp: new Date().toISOString()
        }
      })
      if (error) throw error
      setFeedbackSuccess(true)
      setFeedbackText('')
      setRating(5)
      setTimeout(() => setFeedbackSuccess(false), 3000)
    } catch (err) {
      console.error('Feedback submit error:', err)
    } finally {
      setSubmittingFeedback(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-md p-0 sm:p-6 md:p-10 animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="bg-card border border-border/80 shadow-2xl w-full h-full sm:h-[85vh] sm:max-h-[750px] sm:max-w-4xl sm:rounded-2xl overflow-hidden flex flex-col relative z-10">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-5 shrink-0 bg-card">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5.5 h-5.5 text-primary" />
            <h2 className="font-semibold text-lg tracking-tight">Settings & Analytics</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer border border-border/40"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Side tabs */}
          <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r border-border/60 p-4 flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-x-visible shrink-0 bg-muted/5">
            <button
              onClick={() => setActiveTab('account')}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'account' 
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10' 
                  : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>Account Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'analytics' 
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10' 
                  : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Analytics & Telemetry</span>
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'feedback' 
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10' 
                  : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Heart className="w-4 h-4 shrink-0" />
              <span>Voluntary Feedback</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto bg-background/30">
            {activeTab === 'account' && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">Account Information</h3>
                  <p className="text-xs text-muted-foreground mb-4">View your registered details and authorization details.</p>
                  
                  <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3 border-b border-border/45 items-center">
                      <span className="text-sm font-medium text-muted-foreground">User ID</span>
                      <span className="sm:col-span-2 font-mono text-xs text-foreground bg-muted/65 p-2 rounded-lg border border-border/60 break-all select-all">
                        {user?.id || 'Not authenticated'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3 border-b border-border/45 items-center">
                      <span className="text-sm font-medium text-muted-foreground">Email Address</span>
                      <span className="sm:col-span-2 text-sm font-semibold text-foreground break-all select-all">
                        {user?.email || 'Not authenticated'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3 items-center">
                      <span className="text-sm font-medium text-muted-foreground">Registered Date</span>
                      <span className="sm:col-span-2 text-sm text-foreground">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">Appearance Settings</h3>
                  <p className="text-xs text-muted-foreground mb-4">Customize how the application looks to you.</p>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-card border border-border/80 rounded-2xl gap-4 shadow-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-foreground">Theme Mode</span>
                      <span className="text-xs text-muted-foreground">Toggle between light and dark visual themes.</span>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="w-full sm:w-auto px-5 py-2.5 bg-background hover:bg-muted border border-border/80 hover:border-border rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-sm select-none"
                    >
                      {theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Phase 1 Validation Telemetry</h3>
                    <p className="text-xs text-muted-foreground">Metrics from your current active session and history.</p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full font-semibold">
                    Live
                  </span>
                </div>

                {stats.loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground">Fetching telemetry data...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 border border-border/80 bg-card rounded-2xl flex flex-col justify-between shadow-sm hover:border-primary/20 transition-all">
                      <div>
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Chats</span>
                        <span className="text-4xl font-bold mt-2 block text-primary">{stats.chatCount}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-6 pt-3 border-t border-border/40">
                        <FileText className="w-4 h-4 text-primary/70" />
                        <span>Conversations saved</span>
                      </div>
                    </div>

                    <div className="p-5 border border-border/80 bg-card rounded-2xl flex flex-col justify-between shadow-sm hover:border-primary/20 transition-all">
                      <div>
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Messages Sent</span>
                        <span className="text-4xl font-bold mt-2 block text-primary">{stats.messageCount}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-6 pt-3 border-t border-border/40">
                        <MessageCircle className="w-4 h-4 text-primary/70" />
                        <span>User-companion turns</span>
                      </div>
                    </div>

                    <div className="p-5 border border-border/80 bg-card rounded-2xl flex flex-col justify-between shadow-sm hover:border-primary/20 transition-all">
                      <div>
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Session Time</span>
                        <span className="text-4xl font-bold mt-2 block text-primary">{formatDuration(sessionSeconds)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-6 pt-3 border-t border-border/40">
                        <Clock className="w-4 h-4 text-primary/70" />
                        <span>Current active window</span>
                      </div>
                    </div>

                    <div className="p-5 border border-border/80 bg-card rounded-2xl flex flex-col justify-between shadow-sm hover:border-primary/20 transition-all">
                      <div>
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Feedback Logged</span>
                        <span className="text-4xl font-bold mt-2 block text-primary">{stats.feedbackCount}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-6 pt-3 border-t border-border/40">
                        <Heart className="w-4 h-4 fill-primary/10 text-primary" />
                        <span>Voluntary feedback entries</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground leading-relaxed p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-3 shadow-inner">
                  <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    Metrics such as return rates, session duration, and response counts are securely saved to the validation system to evaluate product-market fit. No chat message content is analyzed for metrics.
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'feedback' && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">Voluntary Feedback</h3>
                  <p className="text-xs text-muted-foreground">
                    Help us shape Saathi. Tell us if your companion feels comforting and matches your expectations.
                  </p>
                </div>

                {feedbackSuccess ? (
                  <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium text-center space-y-2 animate-fade-in shadow-sm">
                    <Heart className="w-8 h-8 fill-emerald-500/20 mx-auto text-emerald-500 animate-pulse" />
                    <p className="font-bold text-base">Feedback Saved!</p>
                    <p className="text-xs text-muted-foreground/80">Thank you for helping us validate the Companion system. It has been successfully saved in our metrics database.</p>
                  </div>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Rating</label>
                      <p className="text-xs text-muted-foreground">How helpful or comforting has the companion been today?</p>
                      <div className="flex items-center gap-2 mt-2">
                        {[1, 2, 3, 4, 5].map((stars) => (
                          <button
                            key={stars}
                            type="button"
                            onClick={() => setRating(stars)}
                            className="p-1 rounded-lg hover:scale-110 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <Heart
                              className={`w-8 h-8 transition-all ${
                                stars <= rating
                                  ? 'fill-primary text-primary'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground" htmlFor="comment">
                        Tell us more (optional)
                      </label>
                      <textarea
                        id="comment"
                        rows={5}
                        placeholder="What did you like? What was missing? Does talking to Saathi feel different or comforting?"
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        className="w-full text-sm p-4 rounded-2xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none shadow-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-95 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-md shadow-primary/20"
                    >
                      {submittingFeedback ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>Submit Voluntary Feedback</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
