import React, { useCallback, useRef, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallowCompareEffect } from 'react-use'
import { Tooltip } from 'antd'
import {
  IBaseSelectProps,
  BaseSelect,
  InstanceStatusBadge,
  TextWrap,
} from '../'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client from '@lib/client'
import { addTranslationResource } from '@lib/utils/i18n'
import { usePersistFn, useControllableValue } from 'ahooks'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import {
  buildInstanceTable,
  IInstanceTableItem,
} from '@lib/utils/instanceTable'
import SelectionWithFilter from '@lib/utils/selectionWithFilter'

import DropOverlay from './DropOverlay'
import ValueDisplay from './ValueDisplay'
import { ITableWithFilterRefProps } from './TableWithFilter'

export interface IInstanceSelectProps
  extends Omit<IBaseSelectProps<string[]>, 'dropdownRender' | 'valueRender'> {
  onChange?: (value: string[]) => void
  enableTiFlash?: boolean
  defaultSelectAll?: boolean
  dropContainerProps?: React.HTMLAttributes<HTMLDivElement>
}

export interface IInstanceSelectRefProps {
  getInstanceByKeys: (keys: string[]) => IInstanceTableItem[]
  getInstanceByKey: (key: string) => IInstanceTableItem
}

const translations = {
  en: {
    placeholder: 'Select Instances',
    filterPlaceholder: 'Filter instance',
    selected: {
      all: 'All Instances',
      partial: {
        n: '{{n}} {{component}}',
        all: 'All {{component}}',
      },
    },
    columns: {
      key: 'Instance',
      status: 'Status',
    },
  },
  zh: {
    placeholder: '选择实例',
    filterPlaceholder: '过滤实例',
    selected: {
      all: '所有实例',
      partial: {
        n: '{{n}} {{component}}',
        all: '所有 {{component}}',
      },
    },
    columns: {
      key: '实例',
      status: '状态',
    },
  },
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      instanceSelect: translations[key],
    },
  })
}

function InstanceSelect(
  props: IInstanceSelectProps,
  ref: React.Ref<IInstanceSelectRefProps>
) {
  const [internalVal, setInternalVal] = useControllableValue<string[]>(props)
  const setInternalValPersist = usePersistFn(setInternalVal)
  const {
    enableTiFlash,
    defaultSelectAll,
    dropContainerProps,
    value, // only to exclude from restProps
    onChange, // only to exclude from restProps
    ...restProps
  } = props

  const { t } = useTranslation()

  const {
    data: dataTiDB,
    isLoading: loadingTiDB,
  } = useClientRequest((reqConfig) =>
    client.getInstance().getTiDBTopology(reqConfig)
  )
  const {
    data: dataStores,
    isLoading: loadingStores,
  } = useClientRequest((reqConfig) =>
    client.getInstance().getStoreTopology(reqConfig)
  )
  const { data: dataPD, isLoading: loadingPD } = useClientRequest((reqConfig) =>
    client.getInstance().getPDTopology(reqConfig)
  )

  const columns: IColumn[] = useMemo(
    () => [
      {
        name: t('component.instanceSelect.columns.key'),
        key: 'key',
        minWidth: 150,
        maxWidth: 150,
        onRender: (node: IInstanceTableItem) => {
          return (
            <TextWrap>
              <Tooltip title={node.key}>
                <span>{node.key}</span>
              </Tooltip>
            </TextWrap>
          )
        },
      },
      {
        name: t('component.instanceSelect.columns.status'),
        key: 'status',
        minWidth: 100,
        maxWidth: 100,
        onRender: (node: IInstanceTableItem) => {
          return (
            <TextWrap>
              <InstanceStatusBadge status={node.status} />
            </TextWrap>
          )
        },
      },
    ],
    [t]
  )

  const [tableItems] = useMemo(() => {
    if (loadingTiDB || loadingStores || loadingPD) {
      return [[], []]
    }
    return buildInstanceTable({
      dataPD,
      dataTiDB,
      dataTiKV: dataStores?.tikv,
      dataTiFlash: dataStores?.tiflash,
      includeTiFlash: enableTiFlash,
    })
  }, [
    enableTiFlash,
    dataTiDB,
    dataStores,
    dataPD,
    loadingTiDB,
    loadingStores,
    loadingPD,
  ])

  const selection = useRef(
    new SelectionWithFilter({
      onSelectionChanged: () => {
        const s = selection.current.getAllSelection() as IInstanceTableItem[]
        const keys = s.map((v) => v.key)
        setInternalValPersist([...keys])
      },
    })
  )

  useShallowCompareEffect(() => {
    selection.current?.resetAllSelection(internalVal ?? [])
  }, [internalVal])

  const dataHasLoaded = useRef(false)

  useEffect(() => {
    // When data is loaded for the first time, we need to:
    // - Select all if `defaultSelectAll` is set and value is not given.
    // - Update selection according to value
    if (dataHasLoaded.current) {
      return
    }
    if (tableItems.length === 0) {
      return
    }
    const sel = selection.current
    sel.setChangeEvents(false)
    sel.setAllItems(tableItems)
    if (internalVal && internalVal.length > 0) {
      sel.resetAllSelection(internalVal)
    } else if (defaultSelectAll) {
      sel.setAllSelectionSelected(true)
    }
    sel.setChangeEvents(true)
    dataHasLoaded.current = true
    // [defaultSelectAll, internalVal] is not needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableItems])

  const getInstanceByKeys = usePersistFn((keys: string[]) => {
    const keyToItemMap = {}
    for (const item of tableItems) {
      keyToItemMap[item.key] = item
    }
    return keys.map((key) => keyToItemMap[key])
  })

  const getInstanceByKey = usePersistFn((key: string) => {
    return getInstanceByKeys([key])[0]
  })

  React.useImperativeHandle(ref, () => ({
    getInstanceByKey,
    getInstanceByKeys,
  }))

  const renderValue = useCallback(
    (selectedKeys) => {
      if (
        tableItems.length === 0 ||
        !selectedKeys ||
        selectedKeys.length === 0
      ) {
        return null
      }
      return <ValueDisplay items={tableItems} selectedKeys={selectedKeys} />
    },
    [tableItems]
  )

  const filterTableRef = useRef<ITableWithFilterRefProps>(null)

  const renderDropdown = useCallback(
    () => (
      <DropOverlay
        columns={columns}
        items={tableItems}
        selection={selection.current}
        filterTableRef={filterTableRef}
        containerProps={dropContainerProps}
      />
    ),
    [columns, tableItems, dropContainerProps]
  )

  const handleOpened = useCallback(() => {
    filterTableRef.current?.focusFilterInput()
  }, [])

  return (
    <BaseSelect
      dropdownRender={renderDropdown}
      value={internalVal}
      valueRender={renderValue}
      disabled={loadingTiDB || loadingStores || loadingPD}
      placeholder={t('component.instanceSelect.placeholder')}
      onOpened={handleOpened}
      {...restProps}
    />
  )
}

export default React.forwardRef(InstanceSelect)
