'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useChat } from '@/context/ChatContext'
import { createClient } from '@/lib/supabase/client'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import {
  Send,
  Heart,
  Copy,
  RotateCcw,
  Check,
  Loader2,
  Sparkles,
  User,
  AlertCircle
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at?: string
}

export default function ChatSessionPage() {
  const { id } = useParams()
  const chatId = id as string
  const searchParams = useSearchParams()
  const router = useRouter()
  const { fetchChats, user, sessionId, desktopSidebarOpen } = useChat()
  const supabase = createClient()

  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [chatTitle, setChatTitle] = useState('Saathi')
  const [inputValue, setInputValue] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Streaming message buffer
  const [streamContent, setStreamContent] = useState('')

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activePromptTriggered = useRef(false)

  // Scroll to bottom helper
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  // Adjust textarea height dynamically
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [inputValue])

  // Fetch chat details and history
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!user || !chatId) return
      setLoadingHistory(true)
      setError(null)
      try {
        // Fetch chat title and message history in parallel
        const [chatRes, msgRes] = await Promise.all([
          supabase
            .from('chats')
            .select('title')
            .eq('id', chatId)
            .single(),
          supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true })
        ])

        if (chatRes.error) throw chatRes.error
        if (msgRes.error) throw msgRes.error

        if (chatRes.data) {
          setChatTitle(chatRes.data.title)
        }
        if (msgRes.data) {
          setMessages(msgRes.data)
        }
      } catch (err: any) {
        console.error('Error fetching chat history:', err)
        setError('Failed to load chat history. Please try refreshing.')
      } finally {
        setLoadingHistory(false)
        setTimeout(() => scrollToBottom('auto'), 100)
      }
    }

    loadChatHistory()
  }, [chatId, user, supabase])

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom(streaming ? 'auto' : 'smooth')
  }, [messages, streamContent, streaming])

  // Handle Query Parameter Prompt (e.g. from Welcome Area suggestion card)
  useEffect(() => {
    if (loadingHistory || activePromptTriggered.current || !chatId) return
    const initialPrompt = searchParams?.get('prompt')
    if (initialPrompt) {
      activePromptTriggered.current = true
      // Clear prompt param from URL
      router.replace(`/chat/${chatId}`, { scroll: false })
      // Trigger submission
      handleSendMessage(initialPrompt)
    }
  }, [loadingHistory, chatId, searchParams, router])

  // Helper: Log analytics event
  const logEvent = async (eventType: string, eventData: any = {}) => {
    if (!user) return
    try {
      await supabase.from('analytics_events').insert({
        user_id: user.id,
        session_id: sessionId,
        event_type: eventType,
        event_data: { chat_id: chatId, ...eventData }
      })
    } catch (e) {
      console.error(e)
    }
  }

  // Copy to clipboard helper
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    logEvent('message_copied', { message_id: id })
  }

  // Send message action
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputValue).trim()
    if (!content || streaming) return

    if (!textToSend) {
      setInputValue('')
    }
    setError(null)
    setStreaming(true)
    setStreamContent('')

    // 1. Optimistically append user message to local state
    const tempUserMsgId = Math.random().toString()
    const userMessage: Message = {
      id: tempUserMsgId,
      role: 'user',
      content
    }
    setMessages(prev => [...prev, userMessage])

    let createdUserMsgId = ''
    try {
      // 2. Save user message to Supabase
      const { data: savedMsg, error: saveError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          role: 'user',
          content
        })
        .select()
        .single()

      if (saveError) throw saveError
      if (savedMsg) {
        createdUserMsgId = savedMsg.id
        // Replace temp message with actual database message
        setMessages(prev => prev.map(m => m.id === tempUserMsgId ? savedMsg : m))
      }

      await logEvent('message_sent', { message_id: createdUserMsgId })
      await fetchChats() // Update sidebar ordering

      // 3. Prepare messages for API payload (including historical messages)
      // Exclude temporary/unsaved messages and format correctly
      const chatPayload = messages
        .filter(m => m.id !== tempUserMsgId)
        .map(m => ({ role: m.role, content: m.content }))
      chatPayload.push({ role: 'user', content })

      // 4. Send request to OpenAI API streaming endpoint
      const startTime = Date.now()
      let firstChunkReceived = false
      let fullAssistantReply = ''

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatPayload })
      })

      if (!response.ok) {
        let errMsg = 'API server returned an error.'
        try {
          const errorData = await response.json()
          if (errorData && errorData.error) {
            errMsg = errorData.error
          }
        } catch (_) {}
        throw new Error(errMsg)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Streaming not supported by browser.')
      }

      // Read chunks from stream
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        
        // Track Latency (Time to First Response)
        if (!firstChunkReceived && chunk.trim()) {
          firstChunkReceived = true
          const latency = Date.now() - startTime
          logEvent('time_to_first_response', { latency_ms: latency })
        }

        fullAssistantReply += chunk
        setStreamContent(fullAssistantReply)
      }

      // 5. Stream finished. Save assistant message to Supabase
      const { data: savedAssistantMsg, error: assistantSaveError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          role: 'assistant',
          content: fullAssistantReply
        })
        .select()
        .single()

      if (assistantSaveError) throw assistantSaveError

      if (savedAssistantMsg) {
        setMessages(prev => [...prev, savedAssistantMsg])
      }
      setStreamContent('')
      await logEvent('stream_completed', { assistant_message_id: savedAssistantMsg?.id })
      await fetchChats() // Refresh sidebar ordering

      // 6. Auto-generate title if this is a "New Chat"
      if (chatTitle === 'New Chat') {
        const firstLine = content.split('\n')[0].trim()
        let newTitle = firstLine
        const words = firstLine.split(/\s+/)
        if (words.length > 6) {
          newTitle = words.slice(0, 6).join(' ') + '...'
        }
        if (newTitle.length > 40) {
          newTitle = newTitle.substring(0, 37) + '...'
        }
        
        try {
          const { error: renameError } = await supabase
            .from('chats')
            .update({ title: newTitle })
            .eq('id', chatId)
          
          if (!renameError) {
            setChatTitle(newTitle)
            await fetchChats()
          }
        } catch (titleErr) {
          console.error('Error auto-renaming chat:', titleErr)
        }
      }

    } catch (err: any) {
      console.error('Error during message sending:', err)
      setError(err.message || 'Something went wrong. Please try again.')
      // Remove the optimistic user message if database saving failed entirely
      if (!createdUserMsgId) {
        setMessages(prev => prev.filter(m => m.id !== tempUserMsgId))
      }
    } finally {
      setStreaming(false)
      setStreamContent('')
    }
  }

  // Retry last response
  const handleRetryResponse = async () => {
    if (streaming || messages.length === 0) return

    // Find the last assistant message
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role !== 'assistant') return

    // Confirm with user
    if (!confirm('Would you like to retry the last response?')) return

    setError(null)
    
    try {
      // 1. Delete last message from Supabase
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', lastMsg.id)

      if (deleteError) throw deleteError

      // 2. Remove last message from state
      const updatedMessages = messages.slice(0, -1)
      setMessages(updatedMessages)
      await logEvent('response_retried', { deleted_message_id: lastMsg.id })

      // 3. Find preceding user message content to trigger send
      const precedingUserMsg = updatedMessages[updatedMessages.length - 1]
      if (precedingUserMsg && precedingUserMsg.role === 'user') {
        // Trigger chat generation using the existing conversation list
        setStreaming(true)
        setStreamContent('')

        const chatPayload = updatedMessages.map(m => ({ role: m.role, content: m.content }))
        const startTime = Date.now()
        let firstChunkReceived = false
        let fullReply = ''

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: chatPayload })
        })

        if (!response.ok) {
          let errMsg = 'API server returned an error.'
          try {
            const errorData = await response.json()
            if (errorData && errorData.error) {
              errMsg = errorData.error
            }
          } catch (_) {}
          throw new Error(errMsg)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        if (!reader) throw new Error('Streaming failed.')

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          if (!firstChunkReceived && chunk.trim()) {
            firstChunkReceived = true
            logEvent('time_to_first_response', { latency_ms: Date.now() - startTime, retried: true })
          }
          fullReply += chunk
          setStreamContent(fullReply)
        }

        // Save new assistant message
        const { data: savedMsg } = await supabase
          .from('messages')
          .insert({
            chat_id: chatId,
            role: 'assistant',
            content: fullReply
          })
          .select()
          .single()

        if (savedMsg) {
          setMessages(prev => [...prev, savedMsg])
        }
      }
    } catch (err: any) {
      console.error('Error retrying response:', err)
      setError('Failed to retry response. Please try sending a message instead.')
    } finally {
      setStreaming(false)
      setStreamContent('')
    }
  }

  // Keyboard shortcut helper
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-card/20 backdrop-blur-md z-10">
        <div className={`flex flex-col ${!desktopSidebarOpen ? 'md:pl-10' : ''} transition-all duration-200`}>
          <h2 className="font-semibold text-sm tracking-tight text-foreground truncate max-w-[200px] sm:max-w-xs">
            {chatTitle}
          </h2>
          <span className="text-[10px] text-muted-foreground">Empathetic Session</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 space-y-6">
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">Loading your conversation...</span>
          </div>
        ) : messages.length === 0 && !streaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto p-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-foreground">Welcome to your space.</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Saathi is here. Write down whatever is on your mind, whether it is a small thought, a worry, or something you want to celebrate.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message, idx) => {
              const isAssistant = message.role === 'assistant'
              const showRetry = isAssistant && idx === messages.length - 1 && !streaming

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 sm:gap-4 animate-fade-in ${
                    isAssistant ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {/* Avatar left side for AI */}
                  {isAssistant && (
                    <div className="flex items-center justify-center w-8 h-8 shrink-0">
                      <img src="/logo.png?v=2" alt="Saathi Logo" className="w-full h-full object-contain" />
                    </div>
                  )}

                  {/* Message Bubble wrapper */}
                  <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] space-y-1.5`}>
                    <div
                      className={`px-4 py-3 rounded-2xl border text-sm leading-relaxed ${
                        isAssistant
                          ? 'bg-card border-border/80 text-foreground'
                          : 'bg-primary border-primary/10 text-primary-foreground font-medium shadow-sm shadow-primary/5'
                      }`}
                    >
                      <MarkdownRenderer content={message.content} />
                    </div>

                    {/* Message Actions */}
                    <div
                      className={`flex items-center gap-2 px-1 text-[10px] text-muted-foreground/60 ${
                        isAssistant ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopyMessage(message.id, message.content)}
                        className="p-1 rounded hover:bg-muted hover:text-foreground transition-all cursor-pointer flex items-center gap-1"
                        title="Copy to clipboard"
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {/* Retry Button */}
                      {showRetry && (
                        <button
                          onClick={handleRetryResponse}
                          className="p-1 rounded hover:bg-muted hover:text-foreground transition-all cursor-pointer flex items-center gap-1"
                          title="Retry last response"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Avatar right side for User */}
                  {!isAssistant && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground border border-border shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              )
            })}

            {/* Stream output display */}
            {streaming && streamContent && (
              <div className="flex gap-3 sm:gap-4 animate-fade-in justify-start">
                <div className="flex items-center justify-center w-8 h-8 shrink-0">
                  <img src="/logo.png?v=2" alt="Saathi Logo" className="w-full h-full object-contain animate-pulse" />
                </div>
                <div className="flex flex-col max-w-[85%] sm:max-w-[75%] space-y-1.5">
                  <div className="px-4 py-3 rounded-2xl border border-border/80 bg-card text-foreground text-sm leading-relaxed">
                    <MarkdownRenderer content={streamContent} />
                  </div>
                </div>
              </div>
            )}

            {/* Typing Indicator Bubble */}
            {streaming && !streamContent && (
              <div className="flex gap-3 sm:gap-4 animate-fade-in justify-start">
                <div className="flex items-center justify-center w-8 h-8 shrink-0">
                  <img src="/logo.png?v=2" alt="Saathi Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex items-center gap-1 px-4 py-3 bg-card border border-border/80 rounded-2xl h-9">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 dot-1" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 dot-2" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 dot-3" />
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sticky Bottom Input Section */}
      <div className="p-4 sm:p-6 border-t border-border/60 bg-gradient-to-t from-background via-background/90 to-background/30 backdrop-blur-md">
        <div className="max-w-3xl mx-auto space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-medium animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="relative flex items-end border border-border hover:border-primary/20 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 bg-card/50 rounded-2xl transition-all shadow-sm">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Talk to Saathi..."
              disabled={loadingHistory}
              className="flex-1 max-h-[200px] min-h-[44px] py-3 pl-4 pr-12 text-sm bg-transparent border-0 focus:outline-none resize-none focus:ring-0 leading-relaxed text-foreground placeholder:text-muted-foreground/60 overflow-y-auto"
            />
            
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || streaming || loadingHistory}
              className="absolute right-2.5 bottom-2.5 p-1.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 cursor-pointer"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="text-[10px] text-muted-foreground/60 text-center select-none">
            Shift + Enter for newline. Saathi is a supportive guide, not a substitute for clinical care.
          </div>
        </div>
      </div>
    </div>
  )
}
