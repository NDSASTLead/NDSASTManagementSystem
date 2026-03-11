'use client'

import { useState, useRef } from 'react'
import QRCode from 'react-qr-code'
import { Copy, Check, ExternalLink, Download, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SiteQRCardProps {
  siteName: string
  siteSlug?: string   // omit for the all-sites hub card
  appUrl: string
}

export function SiteQRCard({ siteName, siteSlug, appUrl }: SiteQRCardProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)
  const publicUrl = siteSlug ? `${appUrl}/report/${siteSlug}` : `${appUrl}/report`

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadQR() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${siteSlug || 'hub'}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-900">{siteName}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row gap-4 items-start pt-3">
            {/* QR Code */}
            <div ref={qrRef} className="bg-white p-2 border border-gray-200 rounded-lg flex-shrink-0">
              <QRCode
                value={publicUrl}
                size={120}
                bgColor="#ffffff"
                fgColor="#1f2937"
                level="M"
              />
            </div>

            {/* URL + Actions */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Public link</p>
              <p className="text-sm text-gray-800 break-all bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono mb-3">
                {publicUrl}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={copyLink} className="gap-2 bg-white">
                  {copied ? (
                    <><Check className="w-4 h-4 text-green-600" /> Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy link</>
                  )}
                </Button>

                <Button variant="outline" size="sm" onClick={downloadQR} className="gap-2 bg-white">
                  <Download className="w-4 h-4" />
                  Download QR
                </Button>

                <Button variant="outline" size="sm" asChild className="gap-2 bg-white">
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    Open form
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
