import React from 'react'
import { SlowquerySlowQuery } from '@lib/client'
import { CardTableV2 } from '@lib/components'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { valueColumns } from '@lib/utils/tableColumns'

export interface ITabCoprProps {
  data: SlowquerySlowQuery
}

export default function TabCopr({ data }: ITabCoprProps) {
  const items = [
    {
      key: 'request_count',
      value: data.request_count,
    },
    {
      key: 'process_keys',
      value: getValueFormat('short')(data.process_keys || 0, 1),
    },
    {
      key: 'total_keys',
      value: getValueFormat('short')(data.total_keys || 0, 1),
    },
    {
      key: 'cop_proc_addr',
      value: data.cop_proc_addr,
    },
    {
      key: 'cop_wait_addr',
      value: data.cop_wait_addr,
    },
  ]
  const columns = valueColumns('slow_query.common.columns.')
  return <CardTableV2 cardNoMargin columns={columns} items={items} />
}
