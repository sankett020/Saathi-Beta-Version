'use client'

import React from 'react'
import WelcomeArea from '@/components/WelcomeArea'

export default function ChatPage() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center h-full relative overflow-y-auto">
      <WelcomeArea />
    </div>
  )
}
