'use client'
import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Download, Search, Phone, Mail, Home, X, Check } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}

const empty = {
  number: '', area_sqm: '', owner_first_name: '', owner_last_name: '',
  owner_phone: '', owner_email: '', monthly_fee: '', parking_fee: '', other_fee: '',
  is_rented: false, tenant_name: '', tenant_phone: '', tenant_email: '',
}

export default function ApartmentsPage() {
  const [apartments, setApartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState<any>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const r = await fetch('/api/apartments')
    const d = await r.json()
    setApartments(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = apartments.filter(a => {
    const s = search.toLowerCase()
    return !s || String(a.number).includes(s) ||
      `${a.owner_first_name} ${a.owner_last_name}`.toLowerCase().includes(s)
  })

  function openAdd() {
    setForm(empty)
    setError('')
    setModal('add')
  }

  function openEdit(apt: any) {
    setForm({ ...apt, is_rented: !!apt.is_rented })
    setError('')
    setModal('edit')
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const url = modal === 'edit' ? `/api/apartments/${form.id}` : '/api/apartments'
      const method = modal === 'edit' ? 'PUT' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          number: parseInt(form.number),
          area_sqm: parseFloat(form.area_sqm) || 0,
          monthly_fee: parseFloat(form.monthly_fee) || 0,
          parking_fee: parseFloat(form.parking_fee) || 0,
          other_fee: parseFloat(form.other_fee) || 0,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setModal(null)
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('האם למחוק דירה זו?')) return
    await fetch(`/api/apartments/${id}`, { method: 'DELETE' })
    load()
  }

  function exportCSV() {
    const headers = ['מספר דירה','שטח מ"ר','שם בעלים','טלפון','אימייל','ועד חודשי','חניה','אחר','סה"כ','מושכרת','שם שוכר','טלפון שוכר']
    const rows = apartments.map(a => [
      a.number, a.area_sqm,
      `${a.owner_first_name} ${a.owner_last_name}`,
      a.owner_phone, a.owner_email,
      a.monthly_fee, a.parking_fee, a.other_fee,
      a.monthly_fee + a.parking_fee + a.other_fee,
      a.is_rented ? 'כן' : 'לא',
      a.tenant_name, a.tenant_phone,
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'דירות.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 pt-14 md:pt-0">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">דירות</h1>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary"><Download className="w-4 h-4" />ייצוא CSV</button>
          <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" />הוסף דירה</button>
        </div>
      </div>

      {/* Search */}
      <div className="card p-3 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          className="flex-1 text-sm outline-none bg-transparent placeholder-slate-400"
          placeholder="חיפוש לפי מספר דירה או שם בעלים..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr>
                {['דירה','שטח','בעלים','טלפון','ועד חודשי','חניה','אחר','סה"כ','סטטוס','פעולות'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="text-center py-8 text-slate-400">טוען...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-slate-400">לא נמצאו דירות</td></tr>
              )}
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-cell font-bold text-slate-800">{a.number}</td>
                  <td className="table-cell">{a.area_sqm}</td>
                  <td className="table-cell">
                    <div>
                      <p className="font-medium">{a.owner_first_name} {a.owner_last_name}</p>
                      {a.owner_email && <p className="text-xs text-slate-400">{a.owner_email}</p>}
                    </div>
                  </td>
                  <td className="table-cell text-slate-500">{a.owner_phone}</td>
                  <td className="table-cell">{fmt(a.monthly_fee)}</td>
                  <td className="table-cell">{fmt(a.parking_fee)}</td>
                  <td className="table-cell">{fmt(a.other_fee)}</td>
                  <td className="table-cell font-semibold text-sky-700">{fmt(a.monthly_fee + a.parking_fee + a.other_fee)}</td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${a.is_rented ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {a.is_rented ? 'מושכרת' : 'בבעלות'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-sky-100 rounded-lg text-sky-600 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">{modal === 'add' ? 'הוסף דירה' : 'עריכת דירה'}</h2>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">מספר דירה *</label>
                  <input className="input" type="number" value={form.number} onChange={e => setForm((f: any) => ({ ...f, number: e.target.value }))} />
                </div>
                <div>
                  <label className="label">שטח (מ"ר)</label>
                  <input className="input" type="number" step="0.5" value={form.area_sqm} onChange={e => setForm((f: any) => ({ ...f, area_sqm: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">שם פרטי</label>
                  <input className="input" value={form.owner_first_name} onChange={e => setForm((f: any) => ({ ...f, owner_first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">שם משפחה</label>
                  <input className="input" value={form.owner_last_name} onChange={e => setForm((f: any) => ({ ...f, owner_last_name: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">טלפון</label>
                  <input className="input" value={form.owner_phone} onChange={e => setForm((f: any) => ({ ...f, owner_phone: e.target.value }))} />
                </div>
                <div>
                  <label className="label">אימייל</label>
                  <input className="input" type="email" value={form.owner_email} onChange={e => setForm((f: any) => ({ ...f, owner_email: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">ועד חודשי ₪</label>
                  <input className="input" type="number" value={form.monthly_fee} onChange={e => setForm((f: any) => ({ ...f, monthly_fee: e.target.value }))} />
                </div>
                <div>
                  <label className="label">חניה ₪</label>
                  <input className="input" type="number" value={form.parking_fee} onChange={e => setForm((f: any) => ({ ...f, parking_fee: e.target.value }))} />
                </div>
                <div>
                  <label className="label">אחר ₪</label>
                  <input className="input" type="number" value={form.other_fee} onChange={e => setForm((f: any) => ({ ...f, other_fee: e.target.value }))} />
                </div>
              </div>
              {/* Rental toggle */}
              <div className="border border-slate-200 rounded-xl p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setForm((f: any) => ({ ...f, is_rented: !f.is_rented }))}
                    className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 flex items-center px-1 ${form.is_rented ? 'bg-sky-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_rented ? '-translate-x-4 rtl:translate-x-4' : ''}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">דירה מושכרת</span>
                </label>
                {form.is_rented && (
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">שם שוכר</label>
                        <input className="input" value={form.tenant_name} onChange={e => setForm((f: any) => ({ ...f, tenant_name: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label">טלפון שוכר</label>
                        <input className="input" value={form.tenant_phone} onChange={e => setForm((f: any) => ({ ...f, tenant_phone: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="label">אימייל שוכר</label>
                      <input className="input" type="email" value={form.tenant_email} onChange={e => setForm((f: any) => ({ ...f, tenant_email: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary">ביטול</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                <Check className="w-4 h-4" />
                {saving ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
