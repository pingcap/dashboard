import { ProTable } from "@tidbcloud/uikit/biz"

import { StatementModel } from "../../../models"

import { useStatementColumns } from "./cols"

export function PlansListTable({ data }: { data: StatementModel[] }) {
  const columns = useStatementColumns()

  return (
    <ProTable
      enableSorting
      state={{ sorting: [{ id: "exec_count", desc: true }] }}
      columns={columns}
      data={data}
    />
  )
}
