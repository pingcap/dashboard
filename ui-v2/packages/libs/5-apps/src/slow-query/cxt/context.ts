import { createContext, useContext } from "react"

import { ISlowQuery } from "../models"

////////////////////////////////

type AppApi = {
  getSlowQueries(params: { limit: number; term: string }): Promise<ISlowQuery[]>
  getSlowQuery(params: { id: number }): Promise<ISlowQuery>
}

type AppConfig = {
  title?: string
}

type AppActions = {
  openDetail(id: number): void
  backToList(): void
}

export type AppCtxValue = {
  // we use ctxId to be a part of queryKey for react-query,
  // to differ same requests from different clusters, so this value can be clusterId, or other unique value
  ctxId: string
  api: AppApi
  cfg: AppConfig
  actions: AppActions
}

export const AppContext = createContext<AppCtxValue | null>(null)

export const useAppContext = () => {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error("SlowQuery AppContext must be used within a provider")
  }

  return context
}
