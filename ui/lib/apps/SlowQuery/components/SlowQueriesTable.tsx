import { usePersistFn } from 'ahooks'
import React, { useCallback } from 'react'
import { CardTable, ICardTableProps } from '@lib/components'
import DetailPage from '../pages/Detail'
import { ISlowQueryTableController } from '../utils/useSlowQueryTableController'

interface Props extends Partial<ICardTableProps> {
  controller: ISlowQueryTableController
}

function SlowQueriesTable({ controller, ...restProps }: Props) {
  const {
    loadingSlowQueries,
    tableColumns,
    slowQueries,
    orderOptions: { orderBy, desc },
    changeOrder,
    errors,
    visibleColumnKeys,
  } = controller

  const handleRowClick = usePersistFn((rec) => {
    const qs = DetailPage.buildQuery({
      digest: rec.digest,
      connectId: rec.connection_id,
      timestamp: rec.timestamp,
    })
    window.open(`#/slow_query/detail?${qs}`, '_blank')
  })

  const getKey = useCallback((row) => `${row.digest}_${row.timestamp}`, [])

  return (
    <CardTable
      {...restProps}
      loading={loadingSlowQueries}
      columns={tableColumns}
      items={slowQueries}
      orderBy={orderBy}
      desc={desc}
      onChangeOrder={changeOrder}
      errors={errors}
      visibleColumnKeys={visibleColumnKeys}
      onRowClicked={handleRowClick}
      getKey={getKey}
    />
  )
}

export default SlowQueriesTable
