import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  const session = requireAuth(request)
  if (session instanceof NextResponse) return session

  const { data, error } = await supabase.from('vendors').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const session = requireAuth(request)
  if (session instanceof NextResponse) return session

  try {
    const data = await request.json()
    const { data: vendor, error } = await supabase
      .from('vendors')
      .insert({
        name: data.name,
        phone: data.phone || '',
        type: data.type,
        monthly_estimate: data.monthly_estimate || 0,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(vendor)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
