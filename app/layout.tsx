import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { AuthStateListener } from '@/components/auth/AuthStateListener'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'NDS Maintenance',
  description: 'Northampton District Scouts — Asset Support Team maintenance tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased`}>
        {children}
        {/* Listens for PASSWORD_RECOVERY events on every page, including login */}
        <AuthStateListener />
      </body>
    </html>
  )
}
