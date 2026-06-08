import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Livably",
  description: "Compare Barcelona apartments by outdoor comfort"
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
