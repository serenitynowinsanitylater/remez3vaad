import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/middleware'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/constants'

export async function GET(request: NextRequest) {
  const session = requireAuth(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''

  const { data: settingsData } = await supabase.from('settings').select('key, value')
  const settingsMap: Record<string, string> = {}
  for (const s of settingsData || []) settingsMap[s.key] = s.value
  const openingBalance = parseFloat(settingsMap['opening_balance'] || '0')

  let query = supabase.from('transactions').select('type, category, amount')
  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)
  const { data: txData } = await query

  const incomeByCategory: Record<string, { total: number; count: number }> = {}
  const expenseByCategory: Record<string, { total: number; count: number }> = {}
  for (const cat of INCOME_CATEGORIES) incomeByCategory[cat] = { total: 0, count: 0 }
  for (const cat of EXPENSE_CATEGORIES) expenseByCategory[cat] = { total: 0, count: 0 }

  for (const t of txData || []) {
    if (t.type === 'income') {
      if (!incomeByCategory[t.category]) incomeByCategory[t.category] = { total: 0, count: 0 }
      incomeByCategory[t.category].total += t.amount
      incomeByCategory[t.category].count++
    } else {
      if (!expenseByCategory[t.category]) expenseByCategory[t.category] = { total: 0, count: 0 }
      expenseByCategory[t.category].total += t.amount
      expenseByCategory[t.category].count++
    }
  }

  const totalIncome = Object.values(incomeByCategory).reduce((s, v) => s + v.total, 0)
  const totalExpense = Object.values(expenseByCategory).reduce((s, v) => s + v.total, 0)
  const netBalance = openingBalance + totalIncome - totalExpense

  return NextResponse.json({
    openingBalance, incomeByCategory, expenseByCategory,
    totalIncome, totalExpense, netBalance,
    creditBalance: netBalance > 0 ? netBalance : 0,
    debitBalance: netBalance < 0 ? Math.abs(netBalance) : 0,
  })
}
