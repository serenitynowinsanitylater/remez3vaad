import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ועד בית - רמז 3 רמת השרון',
  description: 'מערכת ניהול קופת ועד בית',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="font-sans antialiased bg-slate-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}
