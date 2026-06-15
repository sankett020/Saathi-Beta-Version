'use client'

import React, { useState } from 'react'
import { useChat } from '@/context/ChatContext'
import { useRouter } from 'next/navigation'
import { Heart, Compass, Wind, Sparkles, Smile, ArrowRight, Loader2 } from 'lucide-react'

const SUGGESTIONS = [
  {
    title: 'Reflect on my day',
    description: 'Help me slow down and think about how today went.',
    prompt: 'I want to reflect on my day today. Can you guide me through a simple reflection?',
    icon: Compass,
    color: 'text-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/10'
  },
  {
    title: 'Feeling overwhelmed',
    description: 'I have a lot on my mind and need help centering myself.',
    prompt: 'I am feeling a bit overwhelmed right now. Can we talk or do a quick centering exercise?',
    icon: Wind,
    color: 'text-sky-500 bg-sky-500/5 dark:bg-sky-500/10 border-sky-500/10'
  },
  {
    title: 'Explore a goal',
    description: 'Let\'s brainstorm ideas for a dream or goal I want to achieve.',
    prompt: 'I want to brainstorm some steps for a goal I have in mind. Can you help me unpack it?',
    icon: Sparkles,
    color: 'text-amber-500 bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/10'
  },
  {
    title: 'Safe space to vent',
    description: 'I just need someone to listen to me express my feelings.',
    prompt: 'I just need a safe space to vent about something. I\'d love for you to listen and support me.',
    icon: Smile,
    color: 'text-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/10'
  }
]

export default function WelcomeArea() {
  const { createChat, user } = useChat()
  const router = useRouter()
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)

  const handleSuggestionClick = async (suggestion: typeof SUGGESTIONS[0]) => {
    if (selectedPrompt) return // Avoid double clicks
    setSelectedPrompt(suggestion.prompt)
    
    // Create chat with suggestion title
    const chatId = await createChat(suggestion.title)
    if (chatId) {
      // Redirect to the new chat with prompt as query parameter
      router.push(`/chat/${chatId}?prompt=${encodeURIComponent(suggestion.prompt)}`)
    } else {
      setSelectedPrompt(null)
    }
  }

  const handleQuickNewChat = async () => {
    setSelectedPrompt('new')
    const chatId = await createChat('New Chat')
    if (chatId) {
      router.push(`/chat/${chatId}`)
    } else {
      setSelectedPrompt(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto animate-fade-in relative z-10 select-none">
      {/* Warm background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      {/* Saathi Pulsing Logo */}
      <div className="flex items-center justify-center w-16 h-16 rounded-2.5xl border border-border mb-6 shadow-sm overflow-hidden animate-pulse duration-3000 p-3">
        <img src="/logo.png?v=2" alt="Saathi Logo" className="w-full h-full object-contain" />
      </div>

      {/* Welcoming Header */}
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        How are you holding up today?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        Saathi is here to listen and support you. Choose a prompt below to start a conversations, or write your own thoughts.
      </p>

      {/* Suggested Prompts Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-10">
        {SUGGESTIONS.map((suggestion) => {
          const Icon = suggestion.icon
          const isCurrentLoading = selectedPrompt === suggestion.prompt

          return (
            <button
              key={suggestion.title}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={selectedPrompt !== null}
              className="group flex flex-col text-left p-4 rounded-2xl border border-border bg-card/40 hover:bg-card hover:border-primary/20 hover:shadow-md transition-all duration-300 relative overflow-hidden cursor-pointer active:scale-98 disabled:opacity-50 disabled:scale-100"
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg border ${suggestion.color} mb-3 transition-colors`}>
                {isCurrentLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                {suggestion.title}
                <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {suggestion.description}
              </p>
            </button>
          )
        })}
      </div>

      {/* Or start empty button */}
      <div className="mt-8">
        <button
          onClick={handleQuickNewChat}
          disabled={selectedPrompt !== null}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 focus:outline-none cursor-pointer disabled:opacity-50"
        >
          {selectedPrompt === 'new' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Or start an empty conversation
        </button>
      </div>
    </div>
  )
}
