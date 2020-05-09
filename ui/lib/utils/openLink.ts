import { NavigateFunction } from 'react-router'
import React from 'react'

// the url param starts with '/', for example: '/statement/detail'
export default function openLink(
  url: string,
  ev: React.MouseEvent<HTMLElement>,
  navigate: NavigateFunction
) {
  const { origin, pathname } = window.location
  const fullUrl = `${origin}${pathname}#${url}`

  if (ev.metaKey || ev.altKey || ev.ctrlKey) {
    // open in a new tab
    window.open(fullUrl, '_blank')
  } else if (ev.shiftKey) {
    // open in a new window
    window.open(fullUrl)
  } else {
    navigate(url)
  }
}
