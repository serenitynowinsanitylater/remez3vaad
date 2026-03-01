import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  const session = requireAuth(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = parseInt(searchParams.get('limit') || '200')

  let query = supabase
    .from('transactions')
    .select('*, vendors(name), apartments(number)')
    .order('date', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)

  if (type) query = query.eq('type', type)
  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten vendor/apartment names
  const result = data.map((t: any) => ({
    ...t,
    vendor_name: t.vendors?.name || null,
    apartment_number: t.apartments?.number || null,
    vendors: undefined,
    apartments: undefined,
  }))

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const session = requireAuth(request)
  if (session instanceof NextResponse) return session

  try {
    const data = await request.json()
    const { data: tx, error } = await supabase
      .from('transactions')
      .insert({
        date: data.date,
        type: data.type,
        amount: parseFloat(data.amount),
        category: data.category,
        vendor_id: data.vendor_id || null,
        description: data.description || '',
        payment_method: data.payment_method || 'העברה בנקאית',
        reference: data.reference || '',
        apartment_id: data.apartment_id || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(tx)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
