'use client'
import { useEffect, useState } from 'react'
import { Save, Check } from 'lucide-react'

export default function SettingsPage() {
  const [openingBalance, setOpeningBalance] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setOpeningBalance(d.opening_balance || '0')
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opening_balance: openingBalance }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-5 pt-14 md:pt-0 max-w-lg">
      <h1 className="text-2xl font-bold text-slate-800">הגדרות</h1>

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">הגדרות קופה</h2>
        <div>
          <label className="label">יתרת פתיחה לקופה ₪</label>
          <p className="text-xs text-slate-400 mb-2">סכום זה נלקח בחשבון בחישוב יתרת הקופה בדשבורד ובמאזן</p>
          {loading ? (
            <div className="input bg-slate-50 text-slate-400">טוען...</div>
          ) : (
            <input
              className="input"
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={e => setOpeningBalance(e.target.value)}
            />
          )}
        </div>

        <button onClick={handleSave} disabled={saving || loading} className="btn-primary">
          {saved ? <><Check className="w-4 h-4" />נשמר!</> : <><Save className="w-4 h-4" />{saving ? 'שומר...' : 'שמור הגדרות'}</>}
        </button>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">מידע על המערכת</h2>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">שם הבניין</span>
            <span className="font-medium">רמז 3, רמת השרון</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">גרסה</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500">בסיס נתונים</span>
            <span className="font-medium">SQLite (מקומי)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
