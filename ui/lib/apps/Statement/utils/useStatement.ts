import { useEffect, useMemo, useState } from 'react'
import { useSessionStorageState } from '@umijs/hooks'

import client, { StatementModel, StatementTimeRange } from '@lib/client'
import useOrderState, { IOrderOptions } from '@lib/utils/useOrderState'

import {
  calcValidStatementTimeRange,
  DEF_TIME_RANGE,
  TimeRange,
} from '../pages/List/TimeRangeSelector'

const QUERY_OPTIONS = 'statement.query_options'

const DEF_ORDER_OPTIONS: IOrderOptions = {
  orderBy: 'sum_latency',
  desc: true,
}

export interface IStatementQueryOptions {
  timeRange: TimeRange
  schemas: string[]
  stmtTypes: string[]
}

export const DEF_STMT_QUERY_OPTIONS: IStatementQueryOptions = {
  timeRange: DEF_TIME_RANGE,
  schemas: [],
  stmtTypes: [],
}

export default function useStatement(
  options?: IStatementQueryOptions,
  needSave: boolean = true
) {
  const { orderOptions, changeOrder } = useOrderState(
    'statement',
    needSave,
    DEF_ORDER_OPTIONS
  )

  const [memoryQueryOptions, setMemoryQueryOptions] = useState(
    options || DEF_STMT_QUERY_OPTIONS
  )
  const [sessionQueryOptions, setSessionQueryOptions] = useSessionStorageState(
    QUERY_OPTIONS,
    options || DEF_STMT_QUERY_OPTIONS
  )
  const queryOptions = useMemo(
    () => (needSave ? sessionQueryOptions : memoryQueryOptions),
    [needSave, memoryQueryOptions, sessionQueryOptions]
  )

  const [enable, setEnable] = useState(true)
  const [allTimeRanges, setAllTimeRanges] = useState<StatementTimeRange[]>([])
  const [allSchemas, setAllSchemas] = useState<string[]>([])
  const [allStmtTypes, setAllStmtTypes] = useState<string[]>([])

  const validTimeRange = useMemo(
    () => calcValidStatementTimeRange(queryOptions.timeRange, allTimeRanges),
    [queryOptions, allTimeRanges]
  )

  const [loadingStatements, setLoadingStatements] = useState(true)
  const [statements, setStatements] = useState<StatementModel[]>([])

  const [refreshTimes, setRefreshTimes] = useState(0)

  function setQueryOptions(newOptions: IStatementQueryOptions) {
    if (needSave) {
      setSessionQueryOptions(newOptions)
    } else {
      setMemoryQueryOptions(newOptions)
    }
  }

  function refresh() {
    setRefreshTimes((prev) => prev + 1)
  }

  useEffect(() => {
    async function queryStatementStatus() {
      const res = await client.getInstance().statementsConfigGet()
      setEnable(res?.data.enable!)
    }

    async function querySchemas() {
      const res = await client.getInstance().statementsSchemasGet()
      setAllSchemas(res?.data || [])
    }

    async function queryTimeRanges() {
      const res = await client.getInstance().statementsTimeRangesGet()
      setAllTimeRanges(res?.data || [])
    }

    async function queryStmtTypes() {
      const res = await client.getInstance().statementsStmtTypesGet()
      setAllStmtTypes(res?.data || [])
    }

    queryStatementStatus()
    querySchemas()
    queryTimeRanges()
    queryStmtTypes()
  }, [refreshTimes])

  useEffect(() => {
    async function queryStatementList() {
      if (allTimeRanges.length === 0) {
        setStatements([])
        return
      }
      setLoadingStatements(true)
      const res = await client
        .getInstance()
        .statementsOverviewsGet(
          validTimeRange.begin_time!,
          validTimeRange.end_time!,
          queryOptions.schemas,
          queryOptions.stmtTypes
        )
      setLoadingStatements(false)
      setStatements(res?.data || [])
    }

    queryStatementList()
  }, [queryOptions, allTimeRanges, validTimeRange])

  return {
    queryOptions,
    setQueryOptions,
    orderOptions,
    changeOrder,
    refresh,

    enable,
    allTimeRanges,
    allSchemas,
    allStmtTypes,
    validTimeRange,
    loadingStatements,
    statements,
  }
}
