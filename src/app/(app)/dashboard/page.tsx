'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Wallet, AlertCircle, Home, Clock } from 'lucide-react'
import Link from 'next/link'

function fmt(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL')
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => {
      setData(d)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const { balance, totalIncome, totalExpense, openingBalance, recentTransactions, aptStats, unpaidDebtors, totalDebt } = data

  const stats = [
    { label: 'יתרה נוכחית', value: fmt(balance), icon: Wallet, color: balance >= 0 ? 'text-emerald-600' : 'text-red-600', bg: balance >= 0 ? 'bg-emerald-50' : 'bg-red-50', border: balance >= 0 ? 'border-emerald-100' : 'border-red-100' },
    { label: 'סך הכנסות', value: fmt(totalIncome), icon: TrendingUp, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
    { label: 'סך הוצאות', value: fmt(totalExpense), icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
    { label: 'חובות חודש נוכחי', value: fmt(totalDebt), icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  ]

  return (
    <div className="space-y-6 pt-14 md:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">דשבורד</h1>
          <p className="text-slate-500 text-sm">יתרת פתיחה: {fmt(openingBalance)}</p>
        </div>
        <Link href="/transactions" className="btn-primary">
          + תנועה חדשה
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`card p-4 border ${s.border}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
              <div className={`p-2 rounded-xl ${s.bg}`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Apt Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="p-3 bg-violet-50 rounded-xl">
            <Home className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">סך דירות</p>
            <p className="text-xl font-bold text-slate-800">{aptStats?.total || 0}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="p-3 bg-sky-50 rounded-xl">
            <Home className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">דירות מושכרות</p>
            <p className="text-xl font-bold text-slate-800">{aptStats?.rented || 0}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">גביה חודשית מקסימלית</p>
            <p className="text-xl font-bold text-slate-800">{fmt(aptStats?.total_monthly_fees || 0)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-700">תנועות אחרונות</h2>
            </div>
            <Link href="/transactions" className="text-sky-600 text-xs hover:underline">הכל</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTransactions.length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm">אין תנועות עדיין</p>
            )}
            {recentTransactions.map((t: any) => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{t.category}</p>
                  <p className="text-xs text-slate-400">{fmtDate(t.date)}{t.vendor_name ? ` · ${t.vendor_name}` : ''}</p>
                </div>
                <span className={`text-sm font-semibold ml-4 ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Unpaid Debtors */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-slate-700">דירות שלא שילמו החודש</h2>
            </div>
            <span className="text-xs text-slate-400">{unpaidDebtors.length} דירות</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {unpaidDebtors.length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm">✅ כל הדירות שילמו החודש</p>
            )}
            {unpaidDebtors.map((a: any) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-700">דירה {a.number}</p>
                  <p className="text-xs text-slate-400">{a.owner_first_name} {a.owner_last_name}</p>
                </div>
                <span className="text-sm font-semibold text-amber-600">{fmt(a.total_monthly)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
