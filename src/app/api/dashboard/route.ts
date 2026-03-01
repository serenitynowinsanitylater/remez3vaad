import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  const session = requireAuth(request)
  if (session instanceof NextResponse) return session

  // Settings
  const { data: settingsData } = await supabase.from('settings').select('key, value')
  const settingsMap: Record<string, string> = {}
  for (const s of settingsData || []) settingsMap[s.key] = s.value
  const openingBalance = parseFloat(settingsMap['opening_balance'] || '0')

  // Totals
  const { data: txData } = await supabase.from('transactions').select('type, amount')
  let totalIncome = 0, totalExpense = 0
  for (const t of txData || []) {
    if (t.type === 'income') totalIncome += t.amount
    else totalExpense += t.amount
  }
  const balance = openingBalance + totalIncome - totalExpense

  // Recent transactions
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select('*, vendors(name)')
    .order('date', { ascending: false })
    .order('id', { ascending: false })
    .limit(10)

  const recent = (recentTransactions || []).map((t: any) => ({
    ...t,
    vendor_name: t.vendors?.name || null,
    vendors: undefined,
  }))

  // Apartment stats
  const { data: apts } = await supabase.from('apartments').select('*')
  const aptList = apts || []
  const aptStats = {
    total: aptList.length,
    rented: aptList.filter((a: any) => a.is_rented).length,
    total_monthly_fees: aptList.reduce((s: number, a: any) => s + (a.monthly_fee || 0) + (a.parking_fee || 0) + (a.other_fee || 0), 0),
  }

  // Unpaid this month
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: paidTx } = await supabase
    .from('transactions')
    .select('apartment_id')
    .eq('type', 'income')
    .gte('date', `${currentMonth}-01`)
    .lte('date', `${currentMonth}-31`)
    .not('apartment_id', 'is', null)

  const paidAptIds = new Set((paidTx || []).map((t: any) => t.apartment_id))
  const unpaidDebtors = aptList.filter((a: any) => {
    const total = (a.monthly_fee || 0) + (a.parking_fee || 0) + (a.other_fee || 0)
    return total > 0 && !paidAptIds.has(a.id)
  })
  const totalDebt = unpaidDebtors.reduce((s: number, a: any) =>
    s + (a.monthly_fee || 0) + (a.parking_fee || 0) + (a.other_fee || 0), 0)

  return NextResponse.json({
    openingBalance, totalIncome, totalExpense, balance,
    recentTransactions: recent,
    aptStats, unpaidDebtors, totalDebt,
  })
}
