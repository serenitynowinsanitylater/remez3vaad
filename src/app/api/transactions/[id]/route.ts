import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/middleware'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = requireAuth(request)
  if (session instanceof NextResponse) return session

  try {
    const data = await request.json()
    const { error } = await supabase
      .from('transactions')
      .update({
        date: data.date,
        type: data.type,
        amount: parseFloat(data.amount),
        category: data.category,
        vendor_id: data.vendor_id || null,
        description: data.description || '',
        payment_method: data.payment_method || 'העברה בנקאית',
        reference: data.reference || '',
        apartment_id: data.apartment_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = requireAuth(request)
  if (session instanceof NextResponse) return session

  const { error } = await supabase.from('transactions').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
