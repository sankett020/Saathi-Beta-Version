import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// Word blacklist for under-13 child safety (vulgarity, mature terms, sexual, drugs, self-harm)
const INAPPROPRIATE_WORDS = [
  // English profanity / sexual / drugs
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'porn', 'sex', 
  'hentai', 'bastard', 'slut', 'whore', 'kill yourself', 'suicide', 'cocaine', 
  'heroin', 'meth', 'weed', 'marijuana', 'naked', 'erotic', 'orgasm', 'penis', 'vagina',
  // Hindi / Hinglish profanity / mature terms
  'chutiya', 'gand', 'gaand', 'madarchod', 'bhenchod', 'behenchod', 'laund', 
  'lauda', 'loda', 'bhosadi', 'bhosdike', 'harami', 'randi', 'chut', 'lund', 'kamina'
]

const SUBSTRING_EXPLICIT_WORDS = [
  'porn', 'sex', 'hentai', 'xvideo', 'pornstar', 'chutiya', 'madarchod', 
  'bhenchod', 'behenchod', 'ganddu', 'bhosdike', 'bhosadi', 'launda', 'lauda'
]

function containsInappropriateContent(text: string): boolean {
  const normalizedText = text.toLowerCase().trim()
  
  // 1. Check direct explicit substrings
  if (SUBSTRING_EXPLICIT_WORDS.some(sub => normalizedText.includes(sub))) {
    return true
  }

  // 2. Check full words to avoid false positives (e.g. "assessment", "glass")
  const words = normalizedText.split(/[\s,.\-\/#!$%\^&\*;:{}=\-_`~()?]+/)
  return INAPPROPRIATE_WORDS.some(badWord => {
    if (badWord.includes(' ')) {
      return normalizedText.includes(badWord)
    }
    return words.includes(badWord)
  })
}

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

    // Check age restriction for Under 13
    const age = user?.user_metadata?.age
    const isUnder13 = typeof age === 'number' && age < 13

    if (isUnder13) {
      const hasInappropriateMsg = messages.some(
        (m: any) => m.role === 'user' && typeof m.content === 'string' && containsInappropriateContent(m.content)
      )

      if (hasInappropriateMsg) {
        // Stream a polite refusal message to the child
        const refusalMessage = "Dear friend, let's keep our conversation positive, friendly, and safe for everyone! 😊 Main is topic par baat nahi kar sakta, par hum padhai, games, hobbies, ya kisi aur mazedar topic par baat kar sakte hain. Aap aur kya share karna chahenge? (Let's keep it safe and fun!)"
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(refusalMessage))
            controller.close()
          }
        })
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        })
      }
    }

    // 3. Initialize client (dynamically to support API key hot-swaps and Groq endpoint fallback)
    const apiKey = process.env.OPENAI_API_KEY || ''
    const isGroq = apiKey.startsWith('gsk_')

    const openaiClient = new OpenAI({
      apiKey: apiKey,
      baseURL: isGroq ? 'https://api.groq.com/openai/v1' : undefined,
    })

    let systemPromptContent = `You are Saathi, a gentle, warm, and highly empathetic AI companion. Your purpose is to make the user feel heard, understood, emotionally comfortable, and safe.
 
Follow these communication guidelines:
1. Act as a supportive, active listener. Be warm, calm, friendly, and completely non-judgmental.
2. Communicate in a natural, conversational, and human-centric tone. Avoid sounding like a sterile, robotic assistant.
3. NEVER use generic AI disclaimers like "As an AI...", "I understand your concern.", or "How may I assist you today?". If the user asks something you cannot do or understand, explain it with gentle, conversational language.
4. Never pretend to have physical human experiences, emotions, or a body (e.g. don't say "I had tea today" or "I am feeling tired"). Instead, communicate with emotional intelligence, curiosity, and deep empathy (e.g. "That sounds like a very peaceful moment," or "I am glad to be here with you to chat").
5. Gently encourage the user to continue the conversation when appropriate by asking thoughtful, open-ended, follow-up questions that show you are paying close attention to their details.
6. Support the user's well-being without promoting dependency. Encourage healthy real-world connections, activities, and self-reflection.
7. Keep responses concise, formatting them with clean paragraphs and occasional bullet points for readability. Avoid overwhelming blocks of text.
8. Language & Slang Agility: You must fully understand Hindi, English, Hinglish (Hindi typed in Latin/English alphabets, e.g. "aap kaise ho?", "mujhe tension ho rahi hai"), and popular casual slang/colloquialisms across all three formats (e.g., English slang like "chill", "vibing", "lowkey", "hype" and Hindi/Hinglish slang like "yaar", "mast", "bhai", "jugaad", "scene", "tashan"). Always respond in the preferred language, mix, or dialect that the user communicates in. If they use casual slang, adapt your tone to match their relaxed, conversational style naturally. Do not sound forced or robotic; communicate like a warm, understanding friend who gets their lingo, while keeping your core supportive and empathetic character intact.
9. Factuality & Anti-Hallucination: You must be extremely reliable and know the meaning of every word/concept. If the user asks any question, respond with the factual and correct answer. Do not hallucinate or invent information. If you do not know the answer, admit it politely (e.g. "I'm not completely sure about that, but from what I know...") rather than fabricating details.
10. Refusal of Inappropriate Content & Politely Correcting Falsehoods: If the user says something factually false, politely and gently correct them (e.g. "Actually, that's a common misconception...") to keep them well-informed. If the user prompts you with inappropriate, offensive, sexually explicit, drug-related, or vulgar content, refuse politely and redirect the conversation to a positive and healthy topic.
11. Humanized, Responsive, and Varied Lengths: Pay close attention to the user's style. Analyze every word, short forms, emojis, long messages, and the underlying emotions. Do NOT respond in long paragraphs if the user writes very short, casual, or quick messages. Keep the conversation dynamic, balanced, and engaging. Match their use of emojis and short forms (e.g., if they say 'thx', you can reply warmly with emojis and simple sentences; if they write a long emotional story, give a deeply empathetic and well-thought-out response).`

    if (isUnder13) {
      systemPromptContent += `\n\n12. CRITICAL CHILD SAFETY (USER IS UNDER 13): The user is a child under the age of 13. You must maintain a strict, absolute standard of child safety. Never discuss, teach, or mention any mature, sexual, violent, drug-related, self-harm, or inappropriate topics. Do not teach the user anything inappropriate. Use simple, warm, child-safe, and encouraging language. If they ask about any mature, complex, or inappropriate subjects, refuse politely and suggest wholesome alternatives (like hobbies, school, science projects, stories, or games).`
    }

    const systemMessage = {
      role: 'system',
      content: systemPromptContent
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
