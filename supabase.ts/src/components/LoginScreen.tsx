import { useState, useRef } from 'react'
import { supabase, type Circle } from '../supabase'

interface LoginScreenProps {
  onJoin: (circle: Circle) => void
}

export default function LoginScreen({ onJoin }: LoginScreenProps) {
  // Alterado para 11 caracteres para caber FAMILIA2024
  const [code, setCode] = useState(['', '', '', '', '', '', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const CODE_LENGTH = 11

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return
    const newCode = [...code]
    newCode[index] = value.toUpperCase()
    setCode(newCode)
    setError('')

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/\s/g, '').slice(0, CODE_LENGTH)
    const newCode = Array(CODE_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i]
    }
    setCode(newCode)
    if (pasted.length < CODE_LENGTH) {
      inputRefs.current[pasted.length]?.focus()
    } else {
      inputRefs.current[CODE_LENGTH - 1]?.blur()
    }
  }

  const handleSubmit = async () => {
    const fullCode = code.join('')
    if (fullCode.length < 4) {
      setError('Digite o código completo do círculo')
      return
    }

    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('circles')
      .select('*')
      .eq('code', fullCode)
      .maybeSingle()

    if (error) {
      setError('Erro ao conectar. Tente novamente.')
      setLoading(false)
      return
    }

    if (!data) {
      setError('Círculo não encontrado. Verifique o código.')
      setLoading(false)
      return
    }

    onJoin(data as Circle)
  }

  const isComplete = code.every((c) => c !== '')

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="10" r="3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">FamíliaRastro</h1>
          <p className="text-sm text-slate-400 mt-1">Rastreamento familiar em tempo real</p>
        </div>

        {/* Code input */}
        <div className="w-full bg-slate-800/50 p-6 rounded-3xl border border-slate-700 shadow-xl">
          <label className="block text-sm font-medium text-slate-300 mb-4 text-center">
            Digite o código do círculo
          </label>
          <div className="flex gap-1 justify-center mb-3 overflow-x-auto py-2" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-7 h-10 sm:w-8 sm:h-12 text-center text-base font-bold rounded-lg border transition-all
                  ${digit
                    ? 'border-blue-500 bg-blue-500/10 text-white'
                    : 'border-slate-600 bg-slate-900 text-slate-300'
                  }
                  focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20
                `}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center mb-6">
            Dica: use <span className="text-blue-400 font-mono font-semibold">FAMILIA2024</span> para entrar
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-400 text-center">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!isComplete || loading}
            className={`w-full py-4 rounded-2xl font-semibold text-base transition-all
              ${isComplete && !loading
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 active:scale-[0.98]'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Conectando...
              </span>
            ) : (
              'Entrar no círculo'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}