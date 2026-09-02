import { Check, Copy, Fingerprint } from 'lucide-react'
import { useState } from 'react'

export function ChecksumBadge({ checksum }: { checksum?: { md5?: string; sha256?: string } }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<'md5' | 'sha256' | null>(null)

  if (!checksum || (!checksum.md5 && !checksum.sha256)) return null

  const handleCopy = async (text: string, type: 'md5' | 'sha256') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  return (
    <div className="checksum-badge">
      <button
        className="checksum-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="切换校验值显示"
      >
        <Fingerprint size={13} />
        <span>文件校验</span>
        <span className={`checksum-arrow ${open ? 'open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="checksum-panel">
          {checksum.md5 && (
            <div className="checksum-row">
              <span className="checksum-label">MD5</span>
              <code className="checksum-value">{checksum.md5}</code>
              <button
                className="checksum-copy-btn"
                onClick={() => handleCopy(checksum.md5!, 'md5')}
                aria-label="复制 MD5"
                title="复制 MD5"
              >
                {copied === 'md5' ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              </button>
            </div>
          )}
          {checksum.sha256 && (
            <div className="checksum-row">
              <span className="checksum-label">SHA256</span>
              <code className="checksum-value">{checksum.sha256}</code>
              <button
                className="checksum-copy-btn"
                onClick={() => handleCopy(checksum.sha256!, 'sha256')}
                aria-label="复制 SHA256"
                title="复制 SHA256"
              >
                {copied === 'sha256' ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
