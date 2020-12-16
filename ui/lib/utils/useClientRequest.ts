import { useMount, useUnmount, usePersistFn } from 'ahooks'
import { useState, useRef, useEffect } from 'react'
import axios, { CancelToken, AxiosPromise, CancelTokenSource } from 'axios'

import { ErrorStrategy } from '@lib/client'

export interface ReqConfig {
  cancelToken: CancelToken
  errorStrategy: ErrorStrategy
}

export interface RequestFactory<T> {
  (reqConfig: ReqConfig): AxiosPromise<T>
}

interface Options {
  immediate?: boolean
  afterRequest?: () => void
  beforeRequest?: () => void
}

interface State<T> {
  isLoading: boolean
  data?: T
  error?: any
}

export function useClientRequest<T>(
  reqFactory: RequestFactory<T>,
  options?: Options
) {
  const { immediate = true, afterRequest = null, beforeRequest = null } =
    options || {}

  const [state, setState] = useState<State<T>>({
    isLoading: immediate,
  })

  // If `cancelTokenSource` is null, it means there is no running requests.
  const cancelTokenSource = useRef<CancelTokenSource | null>(null)
  const mounted = useRef(false)

  const sendRequest = usePersistFn(async () => {
    if (!mounted.current) {
      return
    }
    if (cancelTokenSource.current) {
      return
    }

    beforeRequest && beforeRequest()

    cancelTokenSource.current = axios.CancelToken.source()

    setState((s) => ({
      ...s,
      isLoading: true,
      error: undefined,
    }))

    try {
      const reqConfig: ReqConfig = {
        cancelToken: cancelTokenSource.current.token,
        errorStrategy: ErrorStrategy.Custom, // handle the error by component self
      }
      const resp = await reqFactory(reqConfig)
      if (mounted.current) {
        setState({
          data: resp.data,
          isLoading: false,
        })
      }
    } catch (e) {
      if (mounted.current) {
        setState({
          error: e,
          isLoading: false,
        })
      }
    }

    cancelTokenSource.current = null

    afterRequest && afterRequest()
  })

  useMount(() => {
    mounted.current = true
    if (immediate) {
      sendRequest()
    }
  })

  useUnmount(() => {
    mounted.current = false
    if (cancelTokenSource.current != null) {
      cancelTokenSource.current.cancel()
      cancelTokenSource.current = null
    }
  })

  return {
    ...state,
    sendRequest,
  }
}

export interface BatchState<T> {
  isLoading: boolean
  data: (T | null)[]
  error: (any | null)[]
}

export function useBatchClientRequest<T>(
  reqFactories: RequestFactory<T>[],
  options?: Options
) {
  const { immediate = true, afterRequest = null, beforeRequest = null } =
    options || {}

  const [state, setState] = useState<BatchState<T>>({
    isLoading: immediate,
    data: reqFactories.map((_) => null),
    error: reqFactories.map((_) => null),
  })

  const cancelTokenSource = useRef<CancelTokenSource[] | null>(null)
  const mounted = useRef(false)

  const sendRequestEach = async (idx) => {
    try {
      const reqConfig: ReqConfig = {
        cancelToken: cancelTokenSource.current![idx].token,
        errorStrategy: ErrorStrategy.Custom,
      }
      const resp = await reqFactories[idx](reqConfig)
      if (mounted.current) {
        setState((s) => {
          s.data[idx] = resp.data
          return { ...s, data: [...s.data] }
        })
      }
    } catch (e) {
      if (mounted.current) {
        setState((s) => {
          s.error[idx] = e
          return { ...s, error: [...s.error] }
        })
      }
    }
  }

  const sendRequest = usePersistFn(async () => {
    if (!mounted.current) {
      return
    }
    if (cancelTokenSource.current) {
      return
    }

    beforeRequest && beforeRequest()

    cancelTokenSource.current = reqFactories.map((_) =>
      axios.CancelToken.source()
    )
    setState((s) => ({
      ...s,
      isLoading: true,
      error: reqFactories.map((_) => null),
    }))

    const p = reqFactories.map((_, idx) => sendRequestEach(idx))
    await Promise.all(p)
    setState((s) => ({
      ...s,
      isLoading: false,
    }))

    cancelTokenSource.current = null

    afterRequest && afterRequest()
  })

  useMount(() => {
    mounted.current = true
    if (immediate) {
      sendRequest()
    }
  })

  useUnmount(() => {
    mounted.current = false
    if (cancelTokenSource.current != null) {
      cancelTokenSource.current.forEach((c) => c.cancel())
      cancelTokenSource.current = null
    }
  })

  return {
    ...state,
    sendRequest,
  }
}

interface OptionsWithPolling<T> extends Options {
  pollingInterval?: number
  shouldPoll?: ((data: T) => boolean) | null
}

export function useClientRequestWithPolling<T = any>(
  reqFactory: RequestFactory<T>,
  options?: OptionsWithPolling<T>
) {
  const {
    pollingInterval = 1000,
    shouldPoll = null,
    afterRequest = null,
    beforeRequest = null,
    immediate = true,
  } = options || {}
  const mounted = useRef(false)
  const pollingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleNextPoll = () => {
    if (pollingTimer.current == null && mounted.current) {
      pollingTimer.current = setTimeout(() => {
        retRef.current.sendRequest()
        pollingTimer.current = null
      }, pollingInterval)
    }
  }

  const cancelNextPoll = () => {
    if (pollingTimer.current != null) {
      clearTimeout(pollingTimer.current)
      pollingTimer.current = null
    }
  }

  const myBeforeRequest = () => {
    beforeRequest?.()
    cancelNextPoll()
  }

  const myAfterRequest = () => {
    let triggerPoll = true
    if (retRef.current.error) {
      triggerPoll = false
    } else if (retRef.current.data && shouldPoll) {
      triggerPoll = shouldPoll(retRef.current.data)
    }
    if (triggerPoll) {
      scheduleNextPoll()
    }
    afterRequest?.()
  }

  const ret = useClientRequest(reqFactory, {
    immediate,
    beforeRequest: myBeforeRequest,
    afterRequest: myAfterRequest,
  })

  const retRef = useRef(ret)

  useEffect(() => {
    retRef.current = ret
  }, [ret])

  useMount(() => {
    mounted.current = true
  })

  useUnmount(() => {
    mounted.current = false
    cancelNextPoll()
  })

  return ret
}
