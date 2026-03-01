import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './auth'

export function requireAuth(request: NextRequest): { userId: number; email: string } | NextResponse {
  const token = request.cookies.get('vaad_session')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const session = verifyToken(token)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return session
}
