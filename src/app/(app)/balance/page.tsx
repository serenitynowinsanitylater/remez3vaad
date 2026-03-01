'use client'
import { useEffect, useState } from 'react'
import { Download, TrendingUp, TrendingDown, Scale } from 'lucide-react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/constants'

function fmt(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}

function getHalfYearDefaults() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const isSecondHalf = month > 6
  const from = isSecondHalf ? `${year}-07-01` : `${year}-01-01`
  const to = isSecondHalf ? `${year}-12-31` : `${year}-06-30`
  return { from, to }
}

export default function BalancePage() {
  const defaults = getHalfYearDefaults()
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    const r = await fetch(`/api/balance?from=${from}&to=${to}`)
    setData(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function exportCSV() {
    if (!data) return
    const rows: string[][] = []
    rows.push(['מאזן ועד בית - רמז 3 רמת השרון'])
    rows.push([`תקופה: ${from} עד ${to}`])
    rows.push([])
    rows.push(['=== הכנסות ==='])
    rows.push(['קטגוריה', 'סכום'])
    for (const cat of INCOME_CATEGORIES) {
      const val = data.incomeByCategory?.[cat]?.total || 0
      rows.push([cat, val])
    }
    rows.push(['סך הכנסות', data.totalIncome])
    rows.push([])
    rows.push(['=== הוצאות ==='])
    rows.push(['קטגוריה', 'סכום'])
    for (const cat of EXPENSE_CATEGORIES) {
      const val = data.expenseByCategory?.[cat]?.total || 0
      rows.push([cat, val])
    }
    rows.push(['סך הוצאות', data.totalExpense])
    rows.push([])
    rows.push(['יתרת פתיחה', data.openingBalance])
    rows.push(['יתרה נטו', data.netBalance])
    rows.push(['סך יתרת זכות', data.creditBalance])
    rows.push(['סך יתרת חובה', data.debitBalance])

    const csv = rows.map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `מאזן_${from}_${to}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 pt-14 md:pt-0">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">מאזן</h1>
        <button onClick={exportCSV} disabled={!data} className="btn-secondary"><Download className="w-4 h-4" />ייצוא CSV</button>
      </div>

      {/* Date range */}
      <div className="card p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">מתאריך</label>
          <input className="input w-40" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">עד תאריך</label>
          <input className="input w-40" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button onClick={load} className="btn-primary">הצג</button>
        <div className="flex gap-2 mr-auto">
          {[
            { label: 'ה"ה 1', from: `${new Date().getFullYear()}-01-01`, to: `${new Date().getFullYear()}-06-30` },
            { label: 'ה"ה 2', from: `${new Date().getFullYear()}-07-01`, to: `${new Date().getFullYear()}-12-31` },
            { label: 'שנה שלמה', from: `${new Date().getFullYear()}-01-01`, to: `${new Date().getFullYear()}-12-31` },
          ].map(p => (
            <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to) }} className="btn-secondary text-xs px-3">{p.label}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4 border border-sky-100">
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> סך הכנסות</p>
              <p className="text-xl font-bold text-sky-600">{fmt(data.totalIncome)}</p>
            </div>
            <div className="card p-4 border border-rose-100">
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> סך הוצאות</p>
              <p className="text-xl font-bold text-rose-600">{fmt(data.totalExpense)}</p>
            </div>
            <div className="card p-4 border border-emerald-100">
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Scale className="w-3 h-3" /> סך יתרת זכות</p>
              <p className="text-xl font-bold text-emerald-600">{fmt(data.creditBalance)}</p>
            </div>
            <div className="card p-4 border border-amber-100">
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Scale className="w-3 h-3" /> סך יתרת חובה</p>
              <p className="text-xl font-bold text-amber-600">{fmt(data.debitBalance)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h2 className="font-semibold text-emerald-800">הכנסות</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">קטגוריה</th>
                    <th className="table-header text-left">עסקאות</th>
                    <th className="table-header text-left">סכום</th>
                  </tr>
                </thead>
                <tbody>
                  {INCOME_CATEGORIES.map(cat => {
                    const val = data.incomeByCategory?.[cat] || { total: 0, count: 0 }
                    return (
                      <tr key={cat} className={`hover:bg-slate-50 ${val.total > 0 ? '' : 'opacity-50'}`}>
                        <td className="table-cell">{cat}</td>
                        <td className="table-cell text-slate-400 text-xs">{val.count}</td>
                        <td className="table-cell font-semibold text-emerald-600">{fmt(val.total)}</td>
                      </tr>
                    )
                  })}
                  <tr className="bg-emerald-50 font-bold">
                    <td className="table-cell font-bold text-emerald-800">סך הכנסות</td>
                    <td className="table-cell" />
                    <td className="table-cell font-bold text-emerald-700">{fmt(data.totalIncome)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Expenses */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <h2 className="font-semibold text-rose-800">הוצאות</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">קטגוריה</th>
                    <th className="table-header text-left">עסקאות</th>
                    <th className="table-header text-left">סכום</th>
                  </tr>
                </thead>
                <tbody>
                  {EXPENSE_CATEGORIES.map(cat => {
                    const val = data.expenseByCategory?.[cat] || { total: 0, count: 0 }
                    return (
                      <tr key={cat} className={`hover:bg-slate-50 ${val.total > 0 ? '' : 'opacity-50'}`}>
                        <td className="table-cell">{cat}</td>
                        <td className="table-cell text-slate-400 text-xs">{val.count}</td>
                        <td className="table-cell font-semibold text-rose-600">{fmt(val.total)}</td>
                      </tr>
                    )
                  })}
                  <tr className="bg-rose-50 font-bold">
                    <td className="table-cell font-bold text-rose-800">סך הוצאות</td>
                    <td className="table-cell" />
                    <td className="table-cell font-bold text-rose-700">{fmt(data.totalExpense)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom line */}
          <div className="card p-5 bg-gradient-to-l from-slate-50 to-white border-2 border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500">יתרת פתיחה</p>
                <p className="text-lg font-bold text-slate-700">{fmt(data.openingBalance)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">+ הכנסות</p>
                <p className="text-lg font-bold text-emerald-600">{fmt(data.totalIncome)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">- הוצאות</p>
                <p className="text-lg font-bold text-rose-600">{fmt(data.totalExpense)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">יתרה סופית</p>
                <p className={`text-2xl font-bold ${data.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(data.netBalance)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
