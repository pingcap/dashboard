import { formatTime, useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Alert } from "@tidbcloud/uikit"
import { useMemo } from "react"

import { StatementModel } from "../../models"

export function TimeRangeFixAlert({ data }: { data: StatementModel[] }) {
  const { tt } = useTn("statement")

  const maxTime = useMemo(
    () =>
      data.reduce(
        (max, d) => (d.summary_end_time! > max ? d.summary_end_time! : max),
        0,
      ),
    [data],
  )
  const minTime = useMemo(
    () =>
      data.reduce(
        (min, d) => (d.summary_begin_time! < min ? d.summary_begin_time! : min),
        maxTime,
      ),
    [data, maxTime],
  )

  if (minTime !== maxTime) {
    return (
      <Alert>
        {tt(
          "Due to time window and expiration configurations, currently displaying data in time range is {{begin}} ~ {{end}}",
          {
            begin: formatTime(minTime * 1000),
            end: formatTime(maxTime * 1000),
          },
        )}
      </Alert>
    )
  }

  return null
}