import { Group, Stack, Title } from "@tidbcloud/uikit"

import { useAppContext } from "../../ctx"
import { useListData } from "../../utils/use-data"

import { FiltersWithAdvanced } from "./filters-with-advanced"
import { RefreshButton } from "./refresh-button"
import { ListTable } from "./table"
import { TimeRangeFixAlert } from "./time-range-fix-alert"
// import { ColsSelect } from "./cols-select"

export function List() {
  const ctx = useAppContext()
  const { data, isLoading } = useListData()

  return (
    <Stack>
      {ctx.cfg.title && (
        <Title order={1} mb="md">
          {ctx.cfg.title}
        </Title>
      )}

      <Group>
        <FiltersWithAdvanced />
        <Group ml="auto">
          {/* <ColsSelect /> */}
          <RefreshButton />
        </Group>
      </Group>

      <TimeRangeFixAlert data={data || []} />

      <ListTable data={data || []} isLoading={isLoading} />
    </Stack>
  )
}
