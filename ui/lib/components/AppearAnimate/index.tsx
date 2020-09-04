import cx from 'classnames'
import React, { useState, useCallback } from 'react'
import { useEventListener } from '@umijs/hooks'

export interface IAppearAnimateProps
  extends React.HTMLAttributes<HTMLDivElement> {
  motionName: string
}

// A component similar to CSSMotion but is simpler, and avoids some edge case bugs.
// It simply removes the animation class after animation completes.
function AppearAnimate({
  className,
  motionName,
  children,
}: IAppearAnimateProps) {
  const [isFirst, setIsFirst] = useState(true)

  const handleAnimationEnd = useCallback(() => {
    setIsFirst(false)
  }, [])

  const ref = useEventListener<HTMLDivElement>(
    'animationend',
    handleAnimationEnd
  )

  return (
    <div ref={ref} className={cx(className, { [motionName]: isFirst })}>
      {children}
    </div>
  )
}

export default React.memo(AppearAnimate)
