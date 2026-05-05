'use client'

import { useRef, useState, useEffect } from 'react'

export interface SwipeAction {
  icon: React.ReactNode
  label: string
  /** Background color of the revealed panel — usually a tint matching the
   *  semantic of the action (e.g. emerald for "mark paid", red for "delete"). */
  color: string
  /** Foreground color of the icon + label inside the panel. */
  fgColor?: string
  /** Optional href; when set, a tap on the revealed panel navigates rather
   *  than calling onTrigger. Useful for "view detail" actions. */
  href?: string
  onTrigger?: () => void
}

/**
 * Touch-driven swipe-to-action wrapper. Wraps any list row.
 *
 * - `leftAction` slides in from the LEFT when the user swipes RIGHT.
 * - `rightAction` slides in from the RIGHT when the user swipes LEFT.
 *
 * Past a threshold the row commits and fires the action; otherwise it
 * springs back. We intentionally keep it touch-only — this is a mobile-PWA
 * affordance and adding mouse drag here would just confuse desktop users
 * who already have the existing buttons.
 *
 * The wrapper renders as `block` (full width) and clips overflow so the
 * action panels are hidden until revealed.
 */
const COMMIT_THRESHOLD_PX = 90
const MAX_DRAG_PX = 140

export default function Swipeable({
  children,
  leftAction,
  rightAction,
}: {
  children: React.ReactNode
  leftAction?: SwipeAction
  rightAction?: SwipeAction
}) {
  const [dx, setDx] = useState(0)
  const [committing, setCommitting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const lockedHorizontal = useRef(false)
  const trackRef = useRef<HTMLDivElement>(null)

  // Reset on unmount
  useEffect(() => {
    return () => { startX.current = null; lockedHorizontal.current = false }
  }, [])

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    startX.current = t.clientX
    startY.current = t.clientY
    lockedHorizontal.current = false
    setDragging(true)
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startX.current === null) return
    const t = e.touches[0]
    const dxRaw = t.clientX - startX.current
    const dyRaw = t.clientY - (startY.current ?? t.clientY)

    // Only commit to a horizontal swipe once the gesture clearly leans
    // horizontal — otherwise vertical scrolling gets hijacked.
    if (!lockedHorizontal.current) {
      if (Math.abs(dxRaw) < 8 && Math.abs(dyRaw) < 8) return
      if (Math.abs(dyRaw) > Math.abs(dxRaw)) {
        // Vertical scroll — abort.
        startX.current = null
        return
      }
      lockedHorizontal.current = true
    }

    // Constrain to the side that has an action defined.
    let next = dxRaw
    if (next > 0 && !leftAction) next = 0
    if (next < 0 && !rightAction) next = 0
    next = Math.max(-MAX_DRAG_PX, Math.min(MAX_DRAG_PX, next))
    setDx(next)
  }

  function onTouchEnd() {
    setDragging(false)
    if (!lockedHorizontal.current) { startX.current = null; return }
    startX.current = null
    lockedHorizontal.current = false

    if (dx > COMMIT_THRESHOLD_PX && leftAction) {
      commit(leftAction)
    } else if (dx < -COMMIT_THRESHOLD_PX && rightAction) {
      commit(rightAction)
    } else {
      setDx(0)
    }
  }

  function commit(action: SwipeAction) {
    setCommitting(true)
    // Slide off so the user feels the commit before navigation.
    setDx(action === leftAction ? MAX_DRAG_PX : -MAX_DRAG_PX)
    setTimeout(() => {
      if (action.href) {
        window.location.href = action.href
      } else {
        action.onTrigger?.()
      }
      setDx(0)
      setCommitting(false)
    }, 120)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {leftAction && (
        <ActionPanel
          side="left"
          action={leftAction}
          revealed={dx > 0}
          progress={Math.min(1, dx / COMMIT_THRESHOLD_PX)}
        />
      )}
      {rightAction && (
        <ActionPanel
          side="right"
          action={rightAction}
          revealed={dx < 0}
          progress={Math.min(1, -dx / COMMIT_THRESHOLD_PX)}
        />
      )}
      <div
        ref={trackRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => { setDx(0); setDragging(false); startX.current = null; lockedHorizontal.current = false }}
        style={{
          transform: `translateX(${dx}px)`,
          transition: committing || !dragging ? 'transform 200ms ease-out' : 'none',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function ActionPanel({
  side, action, revealed, progress,
}: {
  side: 'left' | 'right'
  action: SwipeAction
  revealed: boolean
  progress: number
}) {
  const past = progress >= 1
  return (
    <div
      className="absolute inset-y-0 flex items-center px-5"
      style={{
        [side]: 0,
        background: action.color,
        color: action.fgColor ?? '#FFFFFF',
        opacity: revealed ? 1 : 0,
        transition: 'opacity 120ms ease-out',
        // The icon "leans in" further as the user pulls past the threshold so
        // there's tactile feedback that they've committed.
        transform: past ? 'scale(1.08)' : 'scale(1)',
        pointerEvents: 'none',
      }}
    >
      <div className="flex items-center gap-2 font-semibold text-sm">
        {action.icon}
        <span>{action.label}</span>
      </div>
    </div>
  )
}
