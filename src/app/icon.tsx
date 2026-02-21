import { ImageResponse } from 'next/og'
import fs from 'fs'
import path from 'path'

export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default async function Icon() {
  const logoData = fs.readFileSync(
    path.join(process.cwd(), 'public', 'Print_Transparent.svg')
  )

  const base64 = logoData.toString('base64')
  const src = `data:image/svg+xml;base64,${base64}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#18181b',
          borderRadius: 14,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={46} height={46} alt="Norskk" />
      </div>
    ),
    { ...size }
  )
}
