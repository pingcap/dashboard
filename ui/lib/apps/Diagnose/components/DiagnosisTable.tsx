import { Button } from 'antd'
import { AxiosPromise, CancelToken } from 'axios'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoadingOutlined } from '@ant-design/icons'

import client, { DiagnoseTableDef } from '@lib/client'
import { CardTable, DateTime } from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'

import { diagnosisColumns } from '../utils/tableColumns'

// FIXME: use better naming
// stableTimeRange: used to start diagnosing when triggering by clicking "Start" outside this component
// unstableTimeRange: used to start diagnosing when triggering by clicking "Start" inside this component
export interface IDiagnosisTableProps {
  stableTimeRange: [number, number]
  unstableTimeRange: [number, number]
  kind: string
}

type ReqFnType = (cancel: CancelToken) => AxiosPromise<DiagnoseTableDef>

export default function DiagnosisTable({
  stableTimeRange,
  unstableTimeRange,
  kind,
}: IDiagnosisTableProps) {
  const { t } = useTranslation()

  const [internalTimeRange, setInternalTimeRange] = useState<[number, number]>([
    0,
    0,
  ])
  useEffect(() => setInternalTimeRange(stableTimeRange), [stableTimeRange])
  function handleStart() {
    setInternalTimeRange(unstableTimeRange)
  }
  const timeChanged = useMemo(
    () =>
      internalTimeRange[0] !== unstableTimeRange[0] ||
      internalTimeRange[1] !== unstableTimeRange[1],
    [internalTimeRange, unstableTimeRange]
  )

  const reqFn = useRef<ReqFnType | null>(null)
  useEffect(() => {
    reqFn.current = (cancelToken) =>
      client.getInstance().diagnoseDiagnosisPost(
        {
          start_time: internalTimeRange[0],
          end_time: internalTimeRange[1],
          kind,
        },
        { cancelToken }
      )
  }, [internalTimeRange, kind])

  const { data, isLoading, error, sendRequest } = useClientRequest(
    (cancelToken) => reqFn.current!(cancelToken),
    { immediate: false }
  )

  useEffect(() => {
    if (internalTimeRange[0] !== 0) {
      sendRequest()
    }
  }, [internalTimeRange])

  const allRows = useMemo(() => {
    const _columnHeaders =
      data?.column?.map((col) => col.toLocaleLowerCase()) || []
    let _rows: any[] = []
    data?.rows?.forEach((row, rowIdx) => {
      // values (array)
      let _newRow = { row_idx: rowIdx, is_sub: false }
      row.values?.forEach((v, v_idx) => {
        const key = _columnHeaders[v_idx]
        _newRow[key] = v
      })

      //subvalues (2 demensional array)
      let _subRows: any[] = []
      row.sub_values?.forEach((sub_v) => {
        let _subRow = { row_idx: rowIdx, is_sub: true }
        sub_v.forEach((v, idx) => {
          const key = _columnHeaders[idx]
          _subRow[key] = v
        })
        _subRows.push(_subRow)
      })

      _newRow['sub_rows'] = _subRows
      _rows.push(_newRow)
    })
    return _rows
  }, [data])

  const [items, setItems] = useState(allRows)

  ////////////////

  const [rowExpandStatus, setRowExpandStatus] = useState({})
  function toggleExpand(rowIdx, expand) {
    setRowExpandStatus((preStatus) => ({
      ...preStatus,
      [rowIdx]: expand,
    }))
  }

  function cardExtra() {
    if (isLoading) {
      return <LoadingOutlined />
    }
    if (timeChanged || error) {
      return (
        <Button onClick={handleStart}>{t('diagnose.generate.submit')}</Button>
      )
    }
    return null
  }

  return (
    <CardTable
      title={t(`diagnose.table_title.${kind}_diagnosis`)}
      subTitle={
        internalTimeRange[0] > 0 && (
          <span>
            <DateTime.Calendar unixTimestampMs={internalTimeRange[0] * 1000} />{' '}
            ~{' '}
            <DateTime.Calendar unixTimestampMs={internalTimeRange[1] * 1000} />
          </span>
        )
      }
      cardExtra={cardExtra()}
      errors={[error]}
      columns={columns}
      items={items}
      extendLastColumn
    />
  )
}
