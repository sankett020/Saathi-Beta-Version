'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-sm sm:text-base">{children}</p>,
        h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-medium mt-2 mb-1">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-sm">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-sm">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-3 border-primary/40 pl-3 italic my-3 text-muted-foreground text-sm">
            {children}
          </blockquote>
        ),
        code({ className, children, ...props }: any) {
          // Detect if block or inline code
          const contentStr = String(children).replace(/\n$/, '')
          const isBlock = className?.includes('language-') || contentStr.includes('\n')
          const language = className ? className.replace('language-', '') : ''

          return isBlock ? (
            <div className="relative my-3 rounded-xl overflow-hidden border border-border bg-card">
              <div className="flex justify-between items-center px-4 py-1.5 bg-muted/40 border-b border-border text-[10px] font-mono text-muted-foreground uppercase">
                <span>{language || 'code'}</span>
              </div>
              <pre className="p-4 overflow-x-auto text-xs font-mono bg-muted/10 text-foreground leading-relaxed">
                <code>{contentStr}</code>
              </pre>
            </div>
          ) : (
            <code className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-xs text-primary font-semibold" {...props}>
              {contentStr}
            </code>
          )
        },
        table: ({ children }) => (
          <div className="overflow-x-auto my-4 border border-border rounded-xl">
            <table className="w-full text-xs border-collapse text-left">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="px-4 py-2 bg-muted/50 font-semibold border-b border-border">{children}</th>,
        td: ({ children }) => <td className="px-4 py-2 border-b border-border/60">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
