import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/middleware'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = requireAuth(request)
  if (session instanceof NextResponse) return session

  try {
    const data = await request.json()
    const { error } = await supabase
      .from('apartments')
      .update({
        number: data.number,
        area_sqm: data.area_sqm || 0,
        owner_first_name: data.owner_first_name || '',
        owner_last_name: data.owner_last_name || '',
        owner_phone: data.owner_phone || '',
        owner_email: data.owner_email || '',
        monthly_fee: data.monthly_fee || 0,
        parking_fee: data.parking_fee || 0,
        other_fee: data.other_fee || 0,
        is_rented: data.is_rented || false,
        tenant_name: data.tenant_name || '',
        tenant_phone: data.tenant_phone || '',
        tenant_email: data.tenant_email || '',
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

  const { error } = await supabase.from('apartments').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
