'use client'
import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Download, Search, X, Check } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}

const empty = { name: '', phone: '', type: 'חד-פעמי', monthly_estimate: '' }

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState<any>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const r = await fetch('/api/vendors')
    setVendors(await r.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = vendors.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.phone.includes(search))

  function openAdd() { setForm(empty); setError(''); setModal('add') }
  function openEdit(v: any) { setForm({ ...v }); setError(''); setModal('edit') }

  async function handleSave() {
    setSaving(true); setError('')
    try {
      const url = modal === 'edit' ? `/api/vendors/${form.id}` : '/api/vendors'
      const method = modal === 'edit' ? 'PUT' : 'POST'
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, monthly_estimate: parseFloat(form.monthly_estimate) || 0 }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setModal(null); load()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('למחוק ספק זה?')) return
    await fetch(`/api/vendors/${id}`, { method: 'DELETE' })
    load()
  }

  function exportCSV() {
    const headers = ['שם ספק', 'טלפון', 'סוג', 'צפי חודשי']
    const rows = vendors.map(v => [v.name, v.phone, v.type, v.monthly_estimate])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'ספקים.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 pt-14 md:pt-0">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">ספקים</h1>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary"><Download className="w-4 h-4" />ייצוא CSV</button>
          <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" />הוסף ספק</button>
        </div>
      </div>

      <div className="card p-3 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input className="flex-1 text-sm outline-none bg-transparent placeholder-slate-400" placeholder="חיפוש ספקים..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['שם ספק', 'טלפון', 'סוג', 'צפי חודשי', 'פעולות'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center py-8 text-slate-400">טוען...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">אין ספקים</td></tr>}
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="table-cell font-medium text-slate-800">{v.name}</td>
                  <td className="table-cell text-slate-500">{v.phone}</td>
                  <td className="table-cell">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v.type === 'קבוע' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                      {v.type}
                    </span>
                  </td>
                  <td className="table-cell">{v.type === 'קבוע' ? fmt(v.monthly_estimate) : '—'}</td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(v)} className="p-1.5 hover:bg-sky-100 rounded-lg text-sky-600"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(v.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">{modal === 'add' ? 'הוסף ספק' : 'עריכת ספק'}</h2>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">שם ספק *</label>
                <input className="input" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">טלפון</label>
                <input className="input" value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">סוג ספק</label>
                <select className="input" value={form.type} onChange={e => setForm((f: any) => ({ ...f, type: e.target.value }))}>
                  <option value="קבוע">קבוע</option>
                  <option value="חד-פעמי">חד-פעמי</option>
                </select>
              </div>
              {form.type === 'קבוע' && (
                <div>
                  <label className="label">צפי הוצאה חודשי ₪</label>
                  <input className="input" type="number" value={form.monthly_estimate} onChange={e => setForm((f: any) => ({ ...f, monthly_estimate: e.target.value }))} />
                </div>
              )}
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
