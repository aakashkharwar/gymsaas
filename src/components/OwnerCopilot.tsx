'use client'

import { askOwnerCopilot } from '@/app/actions/copilot'
import { Button } from '@/components/ui/button'
import { Bot, MessageSquare, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type ChatMsg = { role: 'user' | 'bot'; content: string }

const STARTER: ChatMsg = {
  role: 'bot',
  content:
    'Owner Copilot — free, koi AI bill nahi. Hindi/English mein poocho, jaise WhatsApp.\nTry: “Aaj kitne aaye?” ya “Ravi ka fee pending hai?”',
}

export default function OwnerCopilot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([STARTER])
  const [suggestions, setSuggestions] = useState([
    'Aaj kitne aaye?',
    'Aaj kaun absent hai?',
    'Kitna collection?',
    'Kaun pending hai?',
  ])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, loading])

  async function send(text: string) {
    const q = text.trim()
    if (!q || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)
    try {
      const local = await import('@/utils/storage').then((s) => s.getAttendance()).catch(() => [])
      let extra: unknown[] = []
      try {
        const raw = window.localStorage.getItem('gymos-attendance-offline-records')
        if (raw) extra = JSON.parse(raw)
      } catch {
        extra = []
      }
      const merged = new Map<string, Record<string, unknown>>()
      for (const row of [...(Array.isArray(extra) ? extra : []), ...(Array.isArray(local) ? local : [])]) {
        const id = String(row?.id || [row?.firstName, row?.lastName, row?.date].filter(Boolean).join('-'))
        merged.set(id, row)
      }
      const hints = [...merged.values()].slice(0, 2000).map((row) => ({
        id: row.id as string | undefined,
        date: row.date as string | undefined,
        createdAt: row.createdAt as string | undefined,
        firstName: row.firstName as string | undefined,
        middleName: row.middleName as string | undefined,
        lastName: row.lastName as string | undefined,
        name: row.name as string | undefined,
        status: row.status as string | undefined,
        entryTime: row.entryTime as string | undefined,
      }))
      const res = await askOwnerCopilot(q, hints)
      setMessages((prev) => [...prev, { role: 'bot', content: res.reply }])
      if (res.suggestions?.length) setSuggestions(res.suggestions)
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: 'Abhi jawab nahi aa paya. Phir try karo.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[min(540px,78vh)] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 text-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white/10 p-2">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Owner Copilot</p>
                <p className="text-[11px] text-slate-300">Free · Hindi + English · no AI cost</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950">
            {messages.map((msg, i) => (
              <div key={`${msg.role}-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'rounded-br-sm bg-indigo-600 text-white'
                      : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100'
                  }`}
                >
                  {msg.content}
                </p>
              </div>
            ))}
            {loading && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Hisab laga raha hoon…</p>
            )}
            <div ref={endRef} />
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {s}
              </button>
            ))}
          </div>

          <form
            className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Aaj kitna collection?"
              className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || loading} className="rounded-full">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      {!open && (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="h-14 w-14 rounded-full shadow-none"
          size="icon-lg"
        >
          <MessageSquare className="h-6 w-6" />
          <span className="sr-only">Open Owner Copilot</span>
        </Button>
      )}
    </div>
  )
}
