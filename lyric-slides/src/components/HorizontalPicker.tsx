import React, { useEffect, useRef } from 'react'
import { Button, Group } from '@mantine/core'

export type PickerItem = {
  key: string
  label: React.ReactNode
  active: boolean
  onClick: () => void
}

type Props = {
  items: PickerItem[]
  activeIndex: number | null
  className?: string
}

export default function HorizontalPicker({ items, activeIndex, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (activeIndex == null) return
    const el = itemRefs.current[activeIndex]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeIndex, items.length])
  return (
    <Group
      ref={containerRef}
      gap="xs"
      wrap="nowrap"
      className={className ? `no-scrollbar ${className}` : 'no-scrollbar'}
      style={{ overflowX: 'auto', maxWidth: '100%', whiteSpace: 'nowrap', scrollbarWidth: 'none' as any }}
    >
      {items.map((it, idx) => (
        <Button
          key={it.key}
          ref={(el) => (itemRefs.current[idx] = el)}
          onClick={it.onClick}
          variant={it.active ? 'light' : 'filled'}
          color={it.active ? 'dark' : 'gray'}
          style={{ textAlign: 'left', flex: '0 0 auto' }}
        >
          {it.label}
        </Button>
      ))}
    </Group>
  )
}

