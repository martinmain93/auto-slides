import { Box } from '@mantine/core'

export default function SlidePreview({
  text,
  credits,
  width = 300,
  height = 200,
}: {
  text: string
  credits?: string
  width?: number
  height?: number
}) {
  return (
    <Box style={{ background: 'black', color: 'white', borderRadius: 6, width, height, minWidth: width, position: 'relative', overflow: 'hidden', flex: '0 0 auto' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <div style={{ fontSize: 14, lineHeight: 1.2, whiteSpace: 'pre-wrap', textAlign: 'center', fontWeight: 700, fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', padding: 6 }}>
          {text}
        </div>
      </div>
      {credits && (
        <div style={{ position: 'absolute', right: 6, bottom: 4, fontSize: 10, opacity: 0.7 }}>{credits}</div>
      )}
    </Box>
  )
}

