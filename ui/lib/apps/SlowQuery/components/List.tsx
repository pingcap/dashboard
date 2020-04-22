import React, { useState, useEffect } from 'react'
import { Select, Space, Tooltip, Input, InputNumber } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardTableV2 } from '@lib/components'
import TimeRangeSelector from './TimeRangeSelector'
import { useTranslation } from 'react-i18next'
import client, { StatementTimeRange, SlowqueryBase } from '@lib/client'
import { ReloadOutlined } from '@ant-design/icons'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import * as useSlowQueryColumn from '../utils/useColumn'
import DetailPage from './Detail'

const { Option } = Select
const { Search } = Input

const tableColumns = (
  rows: SlowqueryBase[],
  onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) => void,
  orderBy: string,
  desc: boolean,
  showFullSQL?: boolean
): IColumn[] => {
  return [
    useSlowQueryColumn.useInstanceColumn(rows),
    useSlowQueryColumn.useConnectionIDColumn(rows),
    useSlowQueryColumn.useDigestColumn(rows, showFullSQL),
    useSlowQueryColumn.useEndTimeColumn(rows),
    {
      ...useSlowQueryColumn.useQueryTimeColumn(rows),
      isSorted: orderBy === 'Query_time',
      isSortedDescending: desc,
      onColumnClick: onColumnClick,
    },
    {
      ...useSlowQueryColumn.useMemoryColumn(rows),
      isSorted: orderBy === 'Mem_max',
      isSortedDescending: desc,
      onColumnClick: onColumnClick,
    },
  ]
}

export default function List() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [curTimeRange, setCurTimeRange] = useState<StatementTimeRange | null>(
    null
  )
  const [curSchemas, setCurSchemas] = useState<string[]>([])
  const [schemas, setSchemas] = useState<string[]>([])
  const [searchText, setSearchText] = useState('')
  const [orderBy, setOrderBy] = useState('Query_time')
  const [desc, setDesc] = useState(true)
  const [limit, setLimit] = useState(50)
  const [refreshTimes, setRefreshTimes] = useState(0)

  const [loading, setLoading] = useState(false)
  const [slowQueryList, setSlowQueryList] = useState<SlowqueryBase[]>([])

  const [columns, setColumns] = useState<IColumn[]>([])

  useEffect(() => {
    setColumns(tableColumns(slowQueryList || [], onColumnClick, orderBy, desc))
    // eslint-disable-next-line
  }, [slowQueryList])

  useEffect(() => {
    async function getSchemas() {
      const res = await client.getInstance().statementsSchemasGet()
      setSchemas(res?.data || [])
    }
    getSchemas()
  }, [])

  useEffect(() => {
    async function getSlowQueryList() {
      setLoading(true)
      const res = await client
        .getInstance()
        .slowqueryListGet(
          curSchemas.join(','),
          desc,
          limit,
          curTimeRange?.end_time,
          curTimeRange?.begin_time,
          orderBy,
          searchText
        )
      setLoading(false)
      if (res?.data) {
        setSlowQueryList(res.data || [])
      }
    }
    getSlowQueryList()
  }, [curTimeRange, curSchemas, orderBy, desc, searchText, limit, refreshTimes])

  // TODO: refine
  const location = useLocation()
  useEffect(() => {
    if (location.search === '?from=detail') {
      // load
      const searchOptionsStr = localStorage.getItem('slow_query_search_options')
      if (searchOptionsStr !== null) {
        const searchOptions = JSON.parse(searchOptionsStr)
        console.log(searchOptions)
        setCurTimeRange(searchOptions.curTimeRange)
        setCurSchemas(searchOptions.curSchemas)
        setSearchText(searchOptions.searchText)
        setLimit(searchOptions.limit)
        setOrderBy(searchOptions.orderBy)
        setDesc(searchOptions.desc)
      }
    }
  }, [])

  function handleTimeRangeChange(val: StatementTimeRange) {
    setCurTimeRange(val)
  }

  function onColumnClick(_ev: React.MouseEvent<HTMLElement>, column: IColumn) {
    if (column.key === orderBy) {
      setDesc(!desc)
    } else {
      setOrderBy(column.key)
      setDesc(true)
    }
  }

  function handleRowClick(rec) {
    const qs = DetailPage.buildQuery({
      digest: rec.digest,
      connectId: rec.connection_id,
      time: rec.query_time,
    })
    navigate(`/slow_query/detail?${qs}`)

    // save search options
    const searchOptions = JSON.stringify({
      curTimeRange,
      curSchemas,
      orderBy,
      desc,
      searchText,
      limit,
    })
    console.log(searchOptions)
    localStorage.setItem('slow_query_search_options', searchOptions)
  }

  return (
    <ScrollablePane style={{ height: '100vh' }}>
      <Card>
        <div style={{ display: 'flex' }}>
          <Space size="middle">
            <TimeRangeSelector onChange={handleTimeRangeChange} />
            <Select
              value={curSchemas}
              mode="multiple"
              allowClear
              placeholder={t('statement.pages.overview.toolbar.select_schemas')}
              style={{ minWidth: 200 }}
              onChange={setCurSchemas}
            >
              {schemas.map((item) => (
                <Option value={item} key={item}>
                  {item}
                </Option>
              ))}
            </Select>
            <Search placeholder="包含文本" onSearch={setSearchText} />
            <InputNumber
              min={1}
              max={200}
              style={{ width: 100 }}
              value={limit}
              onChange={(val) => setLimit(val!)}
              formatter={(value) => `Limit: ${value}`}
              parser={(value) => value?.replace(/[^\d]/g, '') || ''}
            />
          </Space>
          <div style={{ flex: 1 }} />
          <Space size="middle">
            <Tooltip title={t('statement.pages.overview.toolbar.refresh')}>
              <ReloadOutlined
                onClick={() => setRefreshTimes((prev) => prev + 1)}
              />
            </Tooltip>
          </Space>
        </div>
      </Card>
      <CardTableV2
        loading={loading}
        items={slowQueryList || []}
        columns={columns}
        onRowClicked={handleRowClick}
      />
    </ScrollablePane>
  )
}
