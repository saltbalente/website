import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Analizador de Población",
  description: "Herramienta para analizar datos demográficos de población mexicana y salvadoreña en EE.UU.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark" style={{ backgroundColor: "#121212", color: "#ffffff" }}>
      <body
        className={`${inter.className} bg-[#121212] text-white`}
        style={{ backgroundColor: "#121212", color: "#ffffff" }}
      >
        {children}
      </body>
    </html>
  )
}
