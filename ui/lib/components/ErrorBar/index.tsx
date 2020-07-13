import { Alert } from 'antd'
import _ from 'lodash'
import React, { useMemo } from 'react'

export interface IErrorBarProps {
  errors: any[]
}

export default function ErrorBar({ errors }: IErrorBarProps) {
  // show at most 3 kinds of errors
  const errorMsgs = useMemo(
    () =>
      _.uniq(
        _.map(errors, (err) => err?.response?.data?.message || err?.msg || '')
      ).slice(0, 3),
    [errors]
  )

  if (errorMsgs.length === 0) {
    return null
  } else if (errorMsgs.length === 1) {
    return <Alert message={errorMsgs[0]} showIcon type="error" />
  } else {
    return (
      <Alert
        message="Error"
        showIcon
        type="error"
        description={
          <ul>
            {errorMsgs.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        }
      />
    )
  }
}
