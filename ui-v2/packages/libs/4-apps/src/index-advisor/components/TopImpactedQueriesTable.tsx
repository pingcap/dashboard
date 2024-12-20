import { Box } from "@tidbcloud/uikit"
import { MRT_ColumnDef, ProTable } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

// import { SQLWithPopover } from '../../components/SQLWithPopover'
import { ImpactedQueryItem } from "../utils/type"

export function TopImpactedQueriesTable({
  impactedQueries,
}: {
  impactedQueries: ImpactedQueryItem[]
}) {
  const columns = useMemo<MRT_ColumnDef<ImpactedQueryItem>[]>(() => {
    return [
      {
        id: "query",
        header: "Query",
        accessorFn: (row) => (
          <Box maw={320}>
            {/* <SQLWithPopover sql={row.query!} /> */}
            {row.query}
          </Box>
        ),
      },
      {
        id: "improvement",
        header: "Improvement (%)",
        accessorFn: (row) => (row.improvement! * 100).toFixed(2),
        size: 120,
      },
    ]
  }, [])

  return (
    <ProTable
      data={impactedQueries}
      columns={columns}
      mantineTableProps={{ verticalSpacing: "md" }}
    />
  )
}