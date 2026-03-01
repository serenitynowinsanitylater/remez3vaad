'use client'
import { useEffect, useState, useRef } from 'react'
import { Plus, Edit2, Trash2, Download, Upload, Search, X, Check, Filter } from 'lucide-react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '@/lib/constants'

function fmt(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}

const empty = {
  date: new Date().toISOString().split('T')[0],
  type: 'expense', amount: '', category: '',
  vendor_id: '', apartment_id: '', description: '',
  payment_method: 'העברה בנקאית', reference: '',
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [apartments, setApartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState<any>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [tr, vr, ar] = await Promise.all([
      fetch('/api/transactions?limit=200'),
      fetch('/api/vendors'),
      fetch('/api/apartments'),
    ])
    setTransactions(await tr.json())
    setVendors(await vr.json())
    setApartments(await ar.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = transactions.filter(t => {
    if (filterType && t.type !== filterType) return false
    if (!search) return true
    const s = search.toLowerCase()
    return t.category.toLowerCase().includes(s) ||
      (t.description || '').toLowerCase().includes(s) ||
      (t.vendor_name || '').toLowerCase().includes(s)
  })

  function openAdd() {
    setForm({ ...empty, category: EXPENSE_CATEGORIES[0] })
    setError('')
    setModal('add')
  }

  function openEdit(t: any) {
    setForm({
      id: t.id, date: t.date, type: t.type, amount: t.amount,
      category: t.category, vendor_id: t.vendor_id || '',
      apartment_id: t.apartment_id || '',
      description: t.description || '',
      payment_method: t.payment_method || 'העברה בנקאית',
      reference: t.reference || '',
    })
    setError('')
    setModal('edit')
  }

  function handleTypeChange(type: string) {
    const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    setForm((f: any) => ({ ...f, type, category: cats[0] }))
  }

  const cats = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  async function handleSave() {
    setSaving(true); setError('')
    try {
      const url = modal === 'edit' ? `/api/transactions/${form.id}` : '/api/transactions'
      const method = modal === 'edit' ? 'PUT' : 'POST'
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount), vendor_id: form.vendor_id || null, apartment_id: form.apartment_id || null }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setModal(null); load()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('למחוק תנועה זו?')) return
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    load()
  }

  function downloadTemplate() {
    const headers = ['תאריך', 'סוג', 'סכום', 'קטגוריה', 'תיאור', 'אמצעי תשלום', 'אסמכתא']
    const example = ['2024-01-15', 'הוצאה', '500', 'גינון וחומרים', 'גינון ינואר', 'העברה בנקאית', 'REF123']
    const csv = [headers, example].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'תבנית_תנועות.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) { alert('הקובץ ריק'); return }
      const headerLine = lines[0].replace(/^\uFEFF/, '')
      const headers = headerLine.split(',').map(h => h.replace(/^"|"$/g, '').trim())
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim())
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => { obj[h] = values[i] || '' })
        // normalize type
        if (obj['סוג'] === 'הוצאה') obj['סוג'] = 'הוצאה'
        return obj
      })
      const r = await fetch('/api/transactions/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      alert(`יובאו ${d.imported} תנועות בהצלחה`)
      load()
    } catch (e: any) { alert('שגיאה בייבוא: ' + e.message) } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function exportCSV() {
    const headers = ['תאריך', 'סוג', 'סכום', 'קטגוריה', 'ספק', 'תיאור', 'אמצעי תשלום', 'אסמכתא']
    const rows = transactions.map(t => [
      t.date, t.type === 'income' ? 'הכנסה' : 'הוצאה', t.amount,
      t.category, t.vendor_name || '', t.description || '',
      t.payment_method || '', t.reference || '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'תנועות.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 pt-14 md:pt-0 pb-24">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">תנועות</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadTemplate} className="btn-secondary"><Download className="w-4 h-4" />הורד תבנית</button>
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-secondary">
            <Upload className="w-4 h-4" />{importing ? 'מייבא...' : 'ייבוא CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button onClick={exportCSV} className="btn-secondary"><Download className="w-4 h-4" />ייצוא CSV</button>
          <button onClick={openAdd} className="btn-primary hidden md:flex"><Plus className="w-4 h-4" />הוסף תנועה</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="card p-3 flex items-center gap-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input className="flex-1 text-sm outline-none bg-transparent placeholder-slate-400" placeholder="חיפוש..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">הכל</option>
          <option value="income">הכנסות</option>
          <option value="expense">הוצאות</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr>
                {['תאריך', 'סוג', 'קטגוריה', 'ספק', 'תיאור', 'אמצעי תשלום', 'סכום', 'פעולות'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-8 text-slate-400">טוען...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-slate-400">אין תנועות</td></tr>}
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="table-cell text-slate-500 whitespace-nowrap">{t.date}</td>
                  <td className="table-cell">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {t.type === 'income' ? 'הכנסה' : 'הוצאה'}
                    </span>
                  </td>
                  <td className="table-cell font-medium">{t.category}</td>
                  <td className="table-cell text-slate-500">{t.vendor_name || '—'}</td>
                  <td className="table-cell text-slate-500 max-w-32 truncate">{t.description || '—'}</td>
                  <td className="table-cell text-slate-500">{t.payment_method}</td>
                  <td className={`table-cell font-semibold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-sky-100 rounded-lg text-sky-600"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-6 left-6 md:hidden w-14 h-14 bg-sky-600 hover:bg-sky-700 text-white rounded-full shadow-lg shadow-sky-600/30 flex items-center justify-center z-40 transition-all active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">{modal === 'add' ? 'הוסף תנועה' : 'עריכת תנועה'}</h2>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Type toggle */}
              <div className="flex rounded-xl overflow-hidden border border-slate-200">
                <button
                  onClick={() => handleTypeChange('expense')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${form.type === 'expense' ? 'bg-rose-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  הוצאה
                </button>
                <button
                  onClick={() => handleTypeChange('income')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${form.type === 'income' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  הכנסה
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">תאריך *</label>
                  <input className="input" type="date" value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">סכום ₪ *</label>
                  <input className="input" type="number" step="0.01" value={form.amount} onChange={e => setForm((f: any) => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="label">קטגוריה *</label>
                <select className="input" value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}>
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="label">ספק</label>
                <select className="input" value={form.vendor_id} onChange={e => setForm((f: any) => ({ ...f, vendor_id: e.target.value }))}>
                  <option value="">ללא ספק</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>

              {form.type === 'income' && (
                <div>
                  <label className="label">דירה (הכנסה מדייר)</label>
                  <select className="input" value={form.apartment_id} onChange={e => setForm((f: any) => ({ ...f, apartment_id: e.target.value }))}>
                    <option value="">ללא דירה</option>
                    {apartments.map(a => <option key={a.id} value={a.id}>דירה {a.number} - {a.owner_first_name} {a.owner_last_name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="label">אמצעי תשלום</label>
                <select className="input" value={form.payment_method} onChange={e => setForm((f: any) => ({ ...f, payment_method: e.target.value }))}>
                  {['מזומן', 'שיק', 'אשראי', 'העברה בנקאית', 'אחר'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="label">מספר אסמכתא / קישור לקבלה</label>
                <input className="input" value={form.reference} onChange={e => setForm((f: any) => ({ ...f, reference: e.target.value }))} placeholder="מספר קבלה או קישור" />
              </div>

              <div>
                <label className="label">תיאור</label>
                <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} />
              </div>

              {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary">ביטול</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                <Check className="w-4 h-4" />{saving ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
