import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  const session = requireAuth(request)
  if (session instanceof NextResponse) return session

  const { data, error } = await supabase
    .from('apartments')
    .select('*')
    .order('number', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const apartments = data.map(a => ({
    ...a,
    total_monthly: (a.monthly_fee || 0) + (a.parking_fee || 0) + (a.other_fee || 0)
  }))
  return NextResponse.json(apartments)
}

export async function POST(request: NextRequest) {
  const session = requireAuth(request)
  if (session instanceof NextResponse) return session

  try {
    const data = await request.json()
    const { data: apt, error } = await supabase
      .from('apartments')
      .insert({
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
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(apt)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
