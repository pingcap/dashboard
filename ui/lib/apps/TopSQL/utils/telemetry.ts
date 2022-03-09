// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.
import { mixpanel } from '@lib/utils/telemetry'
import { TimeRange } from '@lib/components'
import { TopsqlEditableConfig } from '@lib/client'

export const telemetry = {
  openSelectInstance() {
    mixpanel.track('TopSQL: Open Select Instance')
  },
  finishSelectInstance(type: string) {
    mixpanel.track('TopSQL: Finish Select Instance', { type })
  },
  openTimeRangePicker() {
    mixpanel.track('TopSQL: Open Time Range Picker')
  },
  selectTimeRange(v: TimeRange) {
    mixpanel.track('TopSQL: Select Time Range', v)
  },
  clickZoomOut(v) {
    mixpanel.track('TopSQL: Zoom Out Time Range', { timestamps: v })
  },
  clickRefresh() {
    mixpanel.track('TopSQL: Click Refresh')
  },
  clickAutoRefresh() {
    mixpanel.track('TopSQL: Click Auto Refresh Dropdown')
  },
  selectAutoRefreshOption(seconds: number) {
    mixpanel.track('TopSQL: Select Auto Refresh Option', { seconds })
  },
  clickSettings(type: 'firstTimeTips' | 'settingIcon' | 'bannerTips') {
    mixpanel.track('TopSQL: Click Settings', { type })
  },
  saveSettings(settings: TopsqlEditableConfig) {
    mixpanel.track('TopSQL: Save Settings', { settings })
  },
  clickStatement(index: number) {
    mixpanel.track('TopSQL: Click Statement', {
      rank: index === 5 ? 'other' : index + 1,
    })
  },
  clickPlan(index: number) {
    mixpanel.track('TopSQL: Click Plan', { rank: index + 1 })
  },
}
