'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Lock, Mail, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'שגיאה בהתחברות')
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('שגיאת רשת')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500 shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ועד הבית</h1>
          <p className="text-slate-400 text-sm mt-1">רמז 3, רמת השרון</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-5">כניסה למערכת</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">אימייל</label>
              <div className="relative">
                <Mail className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  className="input pr-9"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="כתובת אימייל"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="label">סיסמה</label>
              <div className="relative">
                <Lock className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-9 pl-9"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="סיסמה"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPw(p => !p)}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2 border border-red-100">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm mt-1"
            >
              {loading ? 'מתחבר...' : 'כניסה'}
            </button>
          </form>
        </div>
        <p className="text-center text-slate-500 text-xs mt-4">מערכת סגורה - גישה מורשית בלבד</p>
      </div>
    </div>
  )
}
