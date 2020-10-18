import { Tooltip } from 'antd'
import { max } from 'lodash'
import {
  ColumnActionsMode,
  IColumn,
} from 'office-ui-fabric-react/lib/DetailsList'
import React from 'react'
import { orange, red } from '@ant-design/colors'

import { StatementModel } from '@lib/client'
import { Bar, Pre } from '@lib/components'
import {
  formatVal,
  genDerivedBar,
  IColumnWithSourceFields,
  TableColumnFactory,
} from '@lib/utils/tableColumnFactory'

///////////////////////////////////////
// statements order list in local by fieldName of IColumn
// slow query order list in backend by key of IColumn
const TRANS_KEY_PREFIX = 'statement.fields'

export const derivedFields = {
  avg_latency: genDerivedBar('avg_latency', 'max_latency', 'min_latency'),
  parse_latency: genDerivedBar('avg_parse_latency', 'max_parse_latency'),
  compile_latency: genDerivedBar('avg_compile_latency', 'max_compile_latency'),
  process_time: genDerivedBar('avg_cop_process_time', 'max_cop_process_time'),
  wait_time: genDerivedBar('avg_cop_wait_time', 'max_cop_wait_time'),
  total_process_time: genDerivedBar('avg_process_time', 'max_process_time'),
  total_wait_time: genDerivedBar('avg_wait_time', 'max_wait_time'),
  backoff_time: genDerivedBar('avg_backoff_time', 'max_backoff_time'),
  avg_write_keys: genDerivedBar('avg_write_keys', 'max_write_keys'),
  avg_processed_keys: genDerivedBar('avg_processed_keys', 'max_processed_keys'),
  avg_total_keys: genDerivedBar('avg_total_keys', 'max_total_keys'),
  prewrite_time: genDerivedBar('avg_prewrite_time', 'max_prewrite_time'),
  commit_time: genDerivedBar('avg_commit_time', 'max_commit_time'),
  get_commit_ts_time: genDerivedBar(
    'avg_get_commit_ts_time',
    'max_get_commit_ts_time'
  ),
  commit_backoff_time: genDerivedBar(
    'avg_commit_backoff_time',
    'max_commit_backoff_time'
  ),
  resolve_lock_time: genDerivedBar(
    'avg_resolve_lock_time',
    'max_resolve_lock_time'
  ),
  local_latch_wait_time: genDerivedBar(
    'avg_local_latch_wait_time',
    'max_local_latch_wait_time'
  ),
  avg_write_size: genDerivedBar('avg_write_size', 'max_write_size'),
  avg_prewrite_regions: genDerivedBar(
    'avg_prewrite_regions',
    'max_prewrite_regions'
  ),
  avg_txn_retry: genDerivedBar('avg_txn_retry', 'max_txn_retry'),
  avg_mem: genDerivedBar('avg_mem', 'max_mem'),
  sum_errors: ['sum_errors', 'sum_warnings'],
  related_schemas: ['table_names'],
}

//////////////////////////////////////////

function avgMinMaxLatencyColumn(
  tcf: TableColumnFactory,
  rows?: { max_latency?: number; min_latency?: number; avg_latency?: number }[]
): IColumn {
  return tcf.bar.multiple({ sources: derivedFields.avg_latency }, 'ns', rows)
}

function errorsWarningsColumn(
  tcf: TableColumnFactory,
  rows?: { sum_errors?: number; sum_warnings?: number }[]
): IColumnWithSourceFields {
  const capacity = rows
    ? max(rows.map((v) => v.sum_errors! + v.sum_warnings!)) ?? 0
    : 0
  const key = 'sum_errors'
  return {
    name: tcf.columnName('errors_warnings'),
    key,
    fieldName: key,
    sourceFields: derivedFields.sum_errors,
    minWidth: 140,
    maxWidth: 200,
    columnActionsMode: ColumnActionsMode.clickable,
    onRender: (rec) => {
      const errorsFmtVal = formatVal(rec.sum_errors, 'short')
      const warningsFmtVal = formatVal(rec.sum_warnings, 'short')
      const tooltipContent = `
Errors:   ${errorsFmtVal}
Warnings: ${warningsFmtVal}`
      return (
        <Tooltip title={<Pre>{tooltipContent.trim()}</Pre>}>
          <Bar
            textWidth={70}
            value={[rec.sum_errors, rec.sum_warnings]}
            colors={[red[4], orange[4]]}
            capacity={capacity}
          >
            {`${errorsFmtVal} / ${warningsFmtVal}`}
          </Bar>
        </Tooltip>
      )
    },
  }
}

////////////////////////////////////////////////
// util methods

function avgMaxColumn<T>(
  tcf: TableColumnFactory,
  displayTransKey: string,
  unit: string,
  rows?: T[]
): IColumn {
  return tcf.bar.multiple(
    {
      displayTransKey,
      sources: derivedFields[displayTransKey],
    },
    unit,
    rows
  )
}

////////////////////////////////////////////////

export function statementColumns(
  rows: StatementModel[],
  showFullSQL?: boolean
): IColumnWithSourceFields[] {
  const tcf = new TableColumnFactory(TRANS_KEY_PREFIX)

  return [
    tcf.sqlText('digest_text', showFullSQL, rows),
    tcf.textWithTooltip('digest', rows),
    tcf.bar.single('sum_latency', 'ns', rows),
    avgMinMaxLatencyColumn(tcf, rows),
    tcf.bar.single('exec_count', 'short', rows),
    {
      ...tcf.textWithTooltip('plan_count', rows),
      minWidth: 100,
      maxWidth: 300,
      columnActionsMode: ColumnActionsMode.clickable,
    },
    avgMaxColumn(tcf, 'avg_mem', 'bytes', rows),
    errorsWarningsColumn(tcf, rows),
    avgMaxColumn(tcf, 'parse_latency', 'ns', rows),
    avgMaxColumn(tcf, 'compile_latency', 'ns', rows),
    tcf.bar.single('sum_cop_task_num', 'short', rows),
    avgMaxColumn(tcf, 'process_time', 'ns', rows),
    avgMaxColumn(tcf, 'wait_time', 'ns', rows),
    avgMaxColumn(tcf, 'total_process_time', 'ns', rows),
    avgMaxColumn(tcf, 'total_wait_time', 'ns', rows),
    avgMaxColumn(tcf, 'backoff_time', 'ns', rows),
    avgMaxColumn(tcf, 'avg_write_keys', 'short', rows),
    avgMaxColumn(tcf, 'avg_processed_keys', 'short', rows),
    avgMaxColumn(tcf, 'avg_total_keys', 'short', rows),
    avgMaxColumn(tcf, 'prewrite_time', 'ns', rows),
    avgMaxColumn(tcf, 'commit_time', 'ns', rows),
    avgMaxColumn(tcf, 'get_commit_ts_time', 'ns', rows),
    avgMaxColumn(tcf, 'commit_backoff_time', 'ns', rows),
    avgMaxColumn(tcf, 'resolve_lock_time', 'ns', rows),
    avgMaxColumn(tcf, 'local_latch_wait_time', 'ns', rows),
    avgMaxColumn(tcf, 'avg_write_size', 'bytes', rows),
    avgMaxColumn(tcf, 'avg_prewrite_regions', 'short', rows),
    avgMaxColumn(tcf, 'avg_txn_retry', 'short', rows),

    tcf.bar.single('sum_backoff_times', 'short', rows),
    tcf.bar.single('avg_affected_rows', 'short', rows),

    tcf.timestamp('first_seen', rows),
    tcf.timestamp('last_seen', rows),
    tcf.textWithTooltip('sample_user', rows),

    tcf.sqlText('query_sample_text', showFullSQL, rows),
    tcf.sqlText('prev_sample_text', showFullSQL, rows),

    tcf.textWithTooltip('schema_name', rows),
    tcf.textWithTooltip('table_names', rows),
    tcf.textWithTooltip('index_names', rows),

    tcf.textWithTooltip('plan_digest', rows),

    {
      ...tcf.textWithTooltip('related_schemas', rows),
      minWidth: 160,
      maxWidth: 240,
      sourceFields: derivedFields.related_schemas,
    },
  ]
}

export function planColumns(rows: StatementModel[]): IColumn[] {
  const tcf = new TableColumnFactory(TRANS_KEY_PREFIX)

  return [
    {
      ...tcf.textWithTooltip('plan_digest'),
      minWidth: 100,
      maxWidth: 300,
    },
    tcf.bar.single('sum_latency', 'ns', rows),
    avgMinMaxLatencyColumn(tcf, rows),
    tcf.bar.single('exec_count', 'short', rows),
    avgMaxColumn(tcf, 'avg_mem', 'bytes', rows),
  ]
}
