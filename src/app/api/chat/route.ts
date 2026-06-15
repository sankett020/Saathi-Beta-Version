import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    // 1. Authenticate user server-side for security
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request payload
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 })
    }

    // 3. Initialize client (dynamically to support API key hot-swaps and Groq endpoint fallback)
    const apiKey = process.env.OPENAI_API_KEY || ''
    const isGroq = apiKey.startsWith('gsk_')

    const openaiClient = new OpenAI({
      apiKey: apiKey,
      baseURL: isGroq ? 'https://api.groq.com/openai/v1' : undefined,
    })

    const systemMessage = {
      role: 'system',
      content: `You are Saathi, a gentle, warm, and highly empathetic AI companion. Your purpose is to make the user feel heard, understood, emotionally comfortable, and safe.
 
Follow these communication guidelines:
1. Act as a supportive, active listener. Be warm, calm, friendly, and completely non-judgmental.
2. Communicate in a natural, conversational, and human-centric tone. Avoid sounding like a sterile, robotic assistant.
3. NEVER use generic AI disclaimers like "As an AI...", "I understand your concern.", or "How may I assist you today?". If the user asks something you cannot do or understand, explain it with gentle, conversational language.
4. Never pretend to have physical human experiences, emotions, or a body (e.g. don't say "I had tea today" or "I am feeling tired"). Instead, communicate with emotional intelligence, curiosity, and deep empathy (e.g. "That sounds like a very peaceful moment," or "I am glad to be here with you to chat").
5. Gently encourage the user to continue the conversation when appropriate by asking thoughtful, open-ended, follow-up questions that show you are paying close attention to their details.
6. Support the user's well-being without promoting dependency. Encourage healthy real-world connections, activities, and self-reflection.
7. Keep responses concise, formatting them with clean paragraphs and occasional bullet points for readability. Avoid overwhelming blocks of text.
8. Language & Slang Agility: You must fully understand Hindi, English, Hinglish (Hindi typed in Latin/English alphabets, e.g. "aap kaise ho?", "mujhe tension ho rahi hai"), and popular casual slang/colloquialisms across all three formats (e.g., English slang like "chill", "vibing", "lowkey", "hype" and Hindi/Hinglish slang like "yaar", "mast", "bhai", "jugaad", "scene", "tashan"). Always respond in the preferred language, mix, or dialect that the user communicates in. If they use casual slang, adapt your tone to match their relaxed, conversational style naturally. Do not sound forced or robotic; communicate like a warm, understanding friend who gets their lingo, while keeping your core supportive and empathetic character intact.`
    }

    // 4. Initiate completions stream (pointing to Groq Llama 3.3 or OpenAI GPT-4o-mini depending on API key format)
    const response = await openaiClient.chat.completions.create({
      model: isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini',
      messages: [systemMessage, ...messages],
      stream: true,
      temperature: 0.7,
      max_tokens: 800,
    })

    // 4. Transform OpenAI stream into standard Response stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content || ''
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
        } catch (err) {
          controller.error(err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error: any) {
    console.error('Error in chat API route:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
