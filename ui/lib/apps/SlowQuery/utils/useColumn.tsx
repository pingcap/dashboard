import React from 'react'
import {
  IColumn,
  ColumnActionsMode,
} from 'office-ui-fabric-react/lib/DetailsList'
import {
  TextWithInfo,
  HighlightSQL,
  TextWrap,
  Bar,
  DateTime,
  Pre,
} from '@lib/components'
import { Tooltip, Badge } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { max } from 'lodash'
import { useTranslation } from 'react-i18next'

function ResultStatusBadge({ status }: { status: 'success' | 'error' }) {
  const { t } = useTranslation()
  return (
    <Badge status={status} text={t(`slow_query.common.status.${status}`)} />
  )
}

function useCommonColumnName(fieldName: string): any {
  return (
    <TextWithInfo.TransKey
      transKey={`slow_query.common.columns.${fieldName}`}
    />
  )
}

export function useConnectionIDColumn(
  _rows?: { connection_id?: number }[] // used for type check only
): IColumn {
  return {
    name: useCommonColumnName('connection_id'),
    key: 'connection_id',
    fieldName: 'connection_id',
    minWidth: 100,
    maxWidth: 120,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
  }
}

export function useSqlColumn(
  _rows?: { query?: string }[], // used for type check only
  showFullSQL?: boolean
): IColumn {
  return {
    name: useCommonColumnName('sql'),
    key: 'sql',
    fieldName: 'sql',
    minWidth: 200,
    maxWidth: 500,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Tooltip
        title={<HighlightSQL sql={rec.query} theme="dark" />}
        placement="right"
      >
        <TextWrap multiline={showFullSQL}>
          {showFullSQL ? (
            <HighlightSQL sql={rec.query} />
          ) : (
            <Pre>{rec.query}</Pre>
          )}
        </TextWrap>
      </Tooltip>
    ),
  }
}

export function useDigestColumn(
  _rows?: { digest?: string }[] // used for type check only
): IColumn {
  return {
    name: useCommonColumnName('digest'),
    key: 'Digest',
    fieldName: 'digest',
    minWidth: 100,
    maxWidth: 150,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Tooltip title={rec.digest}>
        <TextWrap>{rec.digest}</TextWrap>
      </Tooltip>
    ),
  }
}

export function useInstanceColumn(
  _rows?: { instance?: string }[] // used for type check only
): IColumn {
  return {
    name: useCommonColumnName('instance'),
    key: 'instance',
    fieldName: 'instance',
    minWidth: 100,
    maxWidth: 150,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Tooltip title={rec.instance}>
        <TextWrap>{rec.instance}</TextWrap>
      </Tooltip>
    ),
  }
}

export function useDBColumn(
  _rows?: { db?: string }[] // used for type check only
): IColumn {
  return {
    name: useCommonColumnName('db'),
    key: 'DB',
    fieldName: 'db',
    minWidth: 100,
    maxWidth: 150,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Tooltip title={rec.db}>
        <TextWrap>{rec.db}</TextWrap>
      </Tooltip>
    ),
  }
}

export function useSuccessColumn(
  _rows?: { success?: number }[] // used for type check only
): IColumn {
  // !! Don't call `useTranslation()` directly to avoid this method become the custom hook
  // !! So we can use this inside the useMemo(), useEffect() and useState(()=>{...})
  // const { t } = useTranslation()
  return {
    name: useCommonColumnName('result'),
    key: 'Succ',
    fieldName: 'success',
    minWidth: 100,
    maxWidth: 150,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <ResultStatusBadge status={rec.success === 1 ? 'success' : 'error'} />
    ),
  }
}

export function useTimestampColumn(
  _rows?: { timestamp?: number }[] // used for type check only
): IColumn {
  const key = 'Time'
  return {
    name: useCommonColumnName('timestamp'),
    key,
    fieldName: 'timestamp',
    minWidth: 100,
    maxWidth: 150,
    isResizable: true,
    onRender: (rec) => (
      <TextWrap>
        <DateTime.Calendar unixTimestampMs={rec.timestamp * 1000} />
      </TextWrap>
    ),
  }
}

export function useQueryTimeColumn(rows?: { query_time?: number }[]): IColumn {
  const capacity = rows ? max(rows.map((v) => v.query_time)) ?? 0 : 0
  const key = 'Query_time'
  return {
    name: useCommonColumnName('query_time'),
    key,
    fieldName: 'query_time',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => (
      <Bar textWidth={70} value={rec.query_time} capacity={capacity}>
        {getValueFormat('s')(rec.query_time, 1)}
      </Bar>
    ),
  }
}

export function useParseTimeColumn(rows?: { parse_time?: number }[]): IColumn {
  const capacity = rows ? max(rows.map((v) => v.parse_time)) ?? 0 : 0
  const key = 'Parse_time'
  return {
    name: useCommonColumnName('parse_time'),
    key,
    fieldName: 'parse_time',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => (
      <Bar textWidth={70} value={rec.parse_time} capacity={capacity}>
        {getValueFormat('s')(rec.parse_time, 1)}
      </Bar>
    ),
  }
}

export function useCompileTimeColumn(
  rows?: { compile_time?: number }[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v.compile_time)) ?? 0 : 0
  const key = 'Compile_time'
  return {
    name: useCommonColumnName('compile_time'),
    key,
    fieldName: 'compile_time',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => (
      <Bar textWidth={70} value={rec.compile_time} capacity={capacity}>
        {getValueFormat('s')(rec.compile_time, 1)}
      </Bar>
    ),
  }
}

export function useProcessTimeColumn(
  rows?: { process_time?: number }[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v.process_time)) ?? 0 : 0
  const key = 'Process_time'
  return {
    name: useCommonColumnName('process_time'),
    key,
    fieldName: 'process_time',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => (
      <Bar textWidth={70} value={rec.process_time} capacity={capacity}>
        {getValueFormat('s')(rec.process_time, 1)}
      </Bar>
    ),
  }
}

export function useMemoryColumn(rows?: { memory_max?: number }[]): IColumn {
  const capacity = rows ? max(rows.map((v) => v.memory_max)) ?? 0 : 0
  const key = 'Mem_max'
  return {
    name: useCommonColumnName('memory_max'),
    key,
    fieldName: 'memory_max',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => (
      <Bar textWidth={70} value={rec.memory_max} capacity={capacity}>
        {getValueFormat('bytes')(rec.memory_max, 1)}
      </Bar>
    ),
  }
}

export function useTxnStartTsColumn(
  _rows?: { txn_start_ts?: number }[] // used for type check only
): IColumn {
  return {
    name: useCommonColumnName('txn_start_ts'),
    key: 'Txn_start_ts',
    fieldName: 'txn_start_ts',
    minWidth: 100,
    maxWidth: 150,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Tooltip title={rec.txn_start_ts}>
        <TextWrap>{rec.txn_start_ts}</TextWrap>
      </Tooltip>
    ),
  }
}
