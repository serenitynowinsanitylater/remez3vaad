import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/middleware'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/constants'

export async function POST(request: NextRequest) {
  const session = requireAuth(request)
  if (session instanceof NextResponse) return session

  try {
    const { rows } = await request.json() as { rows: Record<string, string>[] }
    const inserts = []

    for (const row of rows) {
      const type = row['סוג'] === 'הכנסה' ? 'income' : 'expense'
      const amount = parseFloat(row['סכום'] || '0')
      if (!amount || isNaN(amount)) continue
      const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
      const category = cats.includes(row['קטגוריה']) ? row['קטגוריה'] : cats[0]
      inserts.push({
        date: row['תאריך'] || new Date().toISOString().split('T')[0],
        type,
        amount,
        category,
        description: row['תיאור'] || '',
        payment_method: row['אמצעי תשלום'] || 'אחר',
        reference: row['אסמכתא'] || '',
        vendor_id: null,
        apartment_id: null,
      })
    }

    if (inserts.length === 0) return NextResponse.json({ imported: 0 })

    const { error } = await supabase.from('transactions').insert(inserts)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ imported: inserts.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
