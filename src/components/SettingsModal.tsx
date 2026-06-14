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
          // Note: Since messages are linked to chats, we fetch messages belonging to user's chats
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
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] relative z-10">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-base">Settings & Analytics</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-[350px]">
          {/* Side tabs */}
          <div className="w-1/3 border-r border-border/60 p-2 flex flex-col gap-1 bg-muted/20">
            <button
              onClick={() => setActiveTab('account')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'account' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Account
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'analytics' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'feedback' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              Feedback
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-5 overflow-y-auto">
            {activeTab === 'account' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Account Profile</h3>
                  <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">User ID</span>
                      <span className="font-mono text-[10px] truncate max-w-[150px]">{user?.id}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{user?.email}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Registered At</span>
                      <span>
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Appearance</h3>
                  <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl text-xs">
                    <span className="text-muted-foreground">Theme Mode</span>
                    <button
                      onClick={toggleTheme}
                      className="px-3 py-1 bg-background hover:bg-muted border border-border rounded-lg text-xs font-medium transition-all cursor-pointer"
                    >
                      {theme === 'light' ? 'Light Theme' : 'Dark Theme'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Phase 1 Validation Telemetry</h3>
                  <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">
                    Live
                  </span>
                </div>

                {stats.loading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground">Fetching telemetry data...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border border-border bg-muted/10 rounded-xl flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">Total Chats</span>
                      <span className="text-xl font-bold mt-1 text-primary">{stats.chatCount}</span>
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-2">
                        <FileText className="w-2.5 h-2.5" />
                        <span>Conversations saved</span>
                      </div>
                    </div>

                    <div className="p-3 border border-border bg-muted/10 rounded-xl flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">Messages Sent</span>
                      <span className="text-xl font-bold mt-1 text-primary">{stats.messageCount}</span>
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-2">
                        <MessageCircle className="w-2.5 h-2.5" />
                        <span>User-companion turns</span>
                      </div>
                    </div>

                    <div className="p-3 border border-border bg-muted/10 rounded-xl flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">Session Time</span>
                      <span className="text-xl font-bold mt-1 text-primary">{formatDuration(sessionSeconds)}</span>
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-2">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Current active window</span>
                      </div>
                    </div>

                    <div className="p-3 border border-border bg-muted/10 rounded-xl flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">Feedback Logged</span>
                      <span className="text-xl font-bold mt-1 text-primary">{stats.feedbackCount}</span>
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-2">
                        <Heart className="w-2.5 h-2.5 fill-primary/10 text-primary" />
                        <span>Voluntary feedback</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-muted-foreground leading-relaxed p-3 bg-accent/20 rounded-xl border border-primary/10 flex gap-2">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    Metrics like return rates, time-to-first-response, and chat counts are logged directly in the `analytics_events` table for product-market fit evaluation.
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'feedback' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-sm font-semibold mb-1">Voluntary Feedback</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  How does chatting with Saathi feel? We want to know if conversations feel comforting, if the companion feels warm, and if you would return.
                </p>

                {feedbackSuccess ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium text-center space-y-1 animate-fade-in">
                    <Heart className="w-6 h-6 fill-emerald-500/20 mx-auto text-emerald-500" />
                    <p className="font-semibold text-sm">Thank you for your feedback!</p>
                    <p>It has been securely stored in the validation database.</p>
                  </div>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Rating</label>
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((stars) => (
                          <button
                            key={stars}
                            type="button"
                            onClick={() => setRating(stars)}
                            className="p-1 rounded hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Heart
                              className={`w-6 h-6 ${
                                stars <= rating
                                  ? 'fill-primary text-primary'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground" htmlFor="comment">
                        Tell us more (optional)
                      </label>
                      <textarea
                        id="comment"
                        rows={3}
                        placeholder="Does this feel different from normal AI? Do you feel heard? Let us know."
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        className="w-full text-xs p-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      {submittingFeedback ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Submit Feedback
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
