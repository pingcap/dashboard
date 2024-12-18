import { createContext, useContext } from "react"

import { StatementModel } from "../models"

////////////////////////////////

type AppApi = {
  getDbs(): Promise<string[]>
  getRuGroups(): Promise<string[]>
  getStmtKinds(): Promise<string[]>

  getStmtList(params: {
    beginTime: number
    endTime: number
    dbs: string[]
    ruGroups: string[]
    stmtKinds: string[]
    term: string
    orderBy: string
    desc: boolean
  }): Promise<StatementModel[]>
  getStmtPlans(params: { id: string }): Promise<StatementModel[]>
  getStmtPlansDetail(params: {
    id: string
    plans: string[]
  }): Promise<StatementModel>
}

type AppConfig = {
  title?: string
}

type AppActions = {
  openDetail(id: string): void
  backToList(): void
  openSlowQueryList(id: string): void
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
    throw new Error("Statement AppContext must be used within a provider")
  }

  return context
}

////////////////////////////////

export function AppProvider(props: {
  children: React.ReactNode
  ctxValue: AppCtxValue
}) {
  return (
    <AppContext.Provider value={props.ctxValue}>
      {props.children}
    </AppContext.Provider>
  )
}
