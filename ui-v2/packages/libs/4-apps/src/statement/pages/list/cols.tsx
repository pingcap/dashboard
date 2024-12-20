import {
  EvictedSQL,
  SQLWithHover,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { formatNumByUnit } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box } from "@tidbcloud/uikit"
import { MRT_ColumnDef } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

import { useAppContext } from "../../ctx"
import { StatementModel } from "../../models"

function SqlCell({ row }: { row: StatementModel }) {
  const ctx = useAppContext()

  function handleClick() {
    const { digest, schema_name, summary_begin_time, summary_end_time } = row
    const id = [summary_begin_time, summary_end_time, digest, schema_name].join(
      ",",
    )
    ctx.actions.openDetail(id)
  }

  return row.digest_text ? (
    <Box sx={{ cursor: "pointer" }} onClick={handleClick} w="100%">
      <SQLWithHover sql={row.digest_text} />
    </Box>
  ) : (
    <EvictedSQL />
  )
}

export function useListTableColumns() {
  const columns = useMemo<MRT_ColumnDef<StatementModel>[]>(() => {
    return [
      {
        id: "digest_text",
        header: "Statement Template",
        minSize: 300,
        enableSorting: false,
        accessorFn: (row) => <SqlCell row={row} />,
      },
      {
        id: "sum_latency",
        header: "Total Latency",
        enableResizing: false,
        accessorFn: (row) => formatNumByUnit(row.sum_latency!, "ns"),
      },
      {
        id: "avg_latency",
        header: "Mean Latency",
        enableResizing: false,
        accessorFn: (row) => formatNumByUnit(row.avg_latency!, "ns"),
      },
      {
        id: "exec_count",
        header: "Executions Count",
        enableResizing: false,
        accessorFn: (row) => formatNumByUnit(row.exec_count!, "short"),
      },
      {
        id: "plan_count",
        header: "Plans Count",
        enableResizing: false,
        accessorFn: (row) => row.plan_count ?? 0,
      },
    ]
  }, [])

  return columns
}