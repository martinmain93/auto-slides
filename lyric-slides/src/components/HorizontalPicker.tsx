import React, { useEffect, useRef, useState } from 'react'
import { Button, Group } from '@mantine/core'

export type PickerItem = {
  key: string
  label: React.ReactNode
  active: boolean
  onClick: () => void
  color?: string
  variant?: 'light' | 'filled' | 'outline' | 'subtle' | 'default'
  style?: React.CSSProperties
}

type Props = {
  items: PickerItem[]
  activeIndex: number | null
  className?: string // applied to wrapper
}

export default function HorizontalPicker({ items, activeIndex, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const canScroll = el.scrollWidth > el.clientWidth
      if (!canScroll) {
        setShowLeft(false)
        setShowRight(false)
        return
      }
      setShowLeft(el.scrollLeft > 0)
      setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    }
    update()
    el.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [items.length])

  useEffect(() => {
    if (activeIndex == null) return
    const el = itemRefs.current[activeIndex]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeIndex, items.length])

  return (
    <div className={className} style={{ position: 'relative' }}>
      <Group
        ref={containerRef}
        gap="xs"
        wrap="nowrap"
        className={'no-scrollbar'}
        style={{ overflowX: 'auto', maxWidth: '100%', whiteSpace: 'nowrap' }}
      >
        {items.map((it, idx) => (
          <Button
            key={it.key}
            ref={(el) => (itemRefs.current[idx] = el)}
            onClick={it.onClick}
            variant={it.variant ?? (it.active ? 'outline' : 'light')}
            color={it.color ?? (it.active ? 'blue' : 'gray')}
            style={{ textAlign: 'left', flex: '0 0 auto', borderWidth: it.active ? 2 : undefined, ...(it.style || {}) }}
          >
            {it.label}
          </Button>
        ))}
      </Group>
      <div className="hp-fade hp-left" style={{ opacity: showLeft ? 1 : 0 }} />
      <div className="hp-fade hp-right" style={{ opacity: showRight ? 1 : 0 }} />
    </div>
  )
}
