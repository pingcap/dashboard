import { AzoresHostMetricsPage } from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_apps-layout/metrics/azores-host")({
  component: AzoresHostMetricsPage,
})
