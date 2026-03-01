import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'
import { signToken, createSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'נדרש אימייל וסיסמה' }, { status: 400 })
    }
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'פרטי התחברות שגויים' }, { status: 401 })
    }
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'פרטי התחברות שגויים' }, { status: 401 })
    }
    const token = signToken({ userId: user.id, email: user.email })
    const response = NextResponse.json({ success: true, email: user.email })
    response.cookies.set(createSessionCookie(token))
    return response
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
