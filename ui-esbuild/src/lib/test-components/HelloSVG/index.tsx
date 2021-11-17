import React from 'react'

import logo from './logo.svg'

import styles from './style.module.less'

export default function HelloSVG() {
  return (
    <div className={styles['hello-svg-container']}>
      <img src={logo} className={styles.logo} alt='logo' />
    </div>
  )
}
