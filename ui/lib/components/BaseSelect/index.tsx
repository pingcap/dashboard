import React, { useState, useCallback, useRef, useMemo } from 'react'
import cx from 'classnames'
import { useEventListener } from '@umijs/hooks'
import { DownOutlined } from '@ant-design/icons'
import Trigger from 'rc-trigger'
import KeyCode from 'rc-util/lib/KeyCode'
import { TextWrap } from '..'

import styles from './index.module.less'

export interface IBaseSelectProps<T>
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    'onChange' | 'placeholder'
  > {
  dropdownRender: () => React.ReactElement
  value?: T
  valueRender: (value?: T) => React.ReactNode
  placeholder?: React.ReactNode
  overlayClassName?: string
  disabled?: boolean
  tabIndex?: number
  autoFocus?: boolean
}

const builtinPlacements = {
  bottomLeft: {
    ignoreShake: true,
    points: ['tl', 'bl'],
    offset: [0, 4],
    overflow: {
      adjustX: 0,
      adjustY: 0,
    },
  },
}

function BaseSelect<T>({
  dropdownRender,
  value,
  valueRender,
  placeholder,
  disabled,
  tabIndex,
  autoFocus,
  className,
  overlayClassName,
  onFocus,
  onBlur,
  onKeyDown,
  onMouseDown,
  ...restProps
}: IBaseSelectProps<T>) {
  const [dropdownVisible, setDropdownVisible] = useState(false)
  const toggleDropdownVisible = useCallback(() => {
    if (disabled) {
      return
    }
    setDropdownVisible((v) => !v)
  }, [disabled])

  const [isFocused, setFocused] = useState(false)

  const handleContainerFocus = useCallback(
    (ev: React.FocusEvent<HTMLDivElement>) => {
      setFocused(true)
      onFocus && onFocus(ev)
    },
    [onFocus]
  )

  const handleContainerBlur = useCallback(
    (ev: React.FocusEvent<HTMLDivElement>) => {
      setDropdownVisible(false)
      setFocused(false)
      onBlur && onBlur(ev)
    },
    [onBlur]
  )

  const handleContainerKeyDown = useCallback(
    (ev: React.KeyboardEvent<HTMLDivElement>) => {
      if (ev.which === KeyCode.ENTER) {
        toggleDropdownVisible()
      } else if (ev.which === KeyCode.ESC) {
        setDropdownVisible(false)
      }
      onKeyDown && onKeyDown(ev)
    },
    [toggleDropdownVisible, onKeyDown]
  )

  const handleContainerMouseDown = useCallback(
    (ev: React.MouseEvent<HTMLDivElement>) => {
      toggleDropdownVisible()
      onMouseDown && onMouseDown(ev)
    },
    [toggleDropdownVisible, onMouseDown]
  )

  const handleOverlayMouseDown = useCallback(
    (ev: React.MouseEvent<HTMLDivElement>) => {
      // Prevent dropdown container blur event
      ev.preventDefault()
    },
    []
  )

  const dropdownOverlayRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const overlay = useMemo(() => {
    return (
      <div
        ref={dropdownOverlayRef}
        onMouseDown={handleOverlayMouseDown}
        className={cx(styles.baseSelectOverlay, overlayClassName)}
      >
        {dropdownRender()}
      </div>
    )
  }, [dropdownRender, overlayClassName, handleOverlayMouseDown])

  useEventListener('mousedown', (ev: MouseEvent) => {
    // Close the dropdown if click outside
    if (!dropdownVisible) {
      return
    }
    const hitElements = [dropdownOverlayRef.current, containerRef.current]
    if (
      hitElements.every(
        (e) =>
          !e ||
          !ev.target ||
          (!e.contains(ev.target as HTMLElement) && e !== ev.target)
      )
    ) {
      setDropdownVisible(false)
    }
  })

  // Close dropdown when disabled change
  React.useEffect(() => {
    setDropdownVisible((v) => {
      if (v && !disabled) {
        return false
      }
      return v
    })
  }, [disabled])

  const renderedValue = valueRender(value)
  const displayAsPlaceholder = renderedValue == null

  return (
    <Trigger
      prefixCls="ant-dropdown"
      builtinPlacements={builtinPlacements}
      showAction={[]}
      hideAction={[]}
      popupPlacement="bottomLeft"
      popupTransitionName="slide-down"
      popup={overlay}
      popupVisible={dropdownVisible}
    >
      <div
        className={cx(styles.baseSelect, className)}
        onFocus={handleContainerFocus}
        onBlur={handleContainerBlur}
        onKeyDown={handleContainerKeyDown}
        onMouseDown={handleContainerMouseDown}
        ref={containerRef}
        {...restProps}
      >
        <div
          className={cx(styles.baseSelectInner, {
            [styles.focused]: isFocused,
            [styles.disabled]: disabled,
          })}
        >
          <input
            autoComplete="off"
            className={styles.baseSelectInput}
            disabled={disabled}
            tabIndex={tabIndex}
            autoFocus={autoFocus}
            readOnly
          />
          <div
            className={cx(styles.baseSelectValueDisplay, {
              [styles.isPlaceholder]: displayAsPlaceholder,
            })}
          >
            <TextWrap>
              {displayAsPlaceholder ? placeholder : renderedValue}
            </TextWrap>
          </div>
        </div>
        <div className={styles.baseSelectArrow}>
          <DownOutlined />
        </div>
      </div>
    </Trigger>
  )
}

export default React.memo(BaseSelect)
