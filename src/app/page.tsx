import { redirect } from 'next/navigation'
import { getSessionFromCookies } from '@/lib/auth'

export default function Home() {
  const session = getSessionFromCookies()
  if (session) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
