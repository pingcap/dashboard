// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package clusterinfo

import (
	"sort"

	"github.com/jinzhu/gorm"
	"github.com/pingcap/log"
	"github.com/thoas/go-funk"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/clusterinfo/hostinfo"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/topology"
)

// fetchAllInstanceHosts fetches all hosts in the cluster and return in ascending order.
func (s *Service) fetchAllInstanceHosts() ([]string, error) {
	allHostsMap := make(map[string]struct{})
	pdInfo, err := topology.FetchPDTopology(s.params.PDClient)
	if err != nil {
		return nil, err
	}
	for _, i := range pdInfo {
		allHostsMap[i.IP] = struct{}{}
	}

	tikvInfo, tiFlashInfo, err := topology.FetchStoreTopology(s.params.PDClient)
	if err != nil {
		return nil, err
	}
	for _, i := range tikvInfo {
		allHostsMap[i.IP] = struct{}{}
	}
	for _, i := range tiFlashInfo {
		allHostsMap[i.IP] = struct{}{}
	}

	tidbInfo, err := topology.FetchTiDBTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		return nil, err
	}
	for _, i := range tidbInfo {
		allHostsMap[i.IP] = struct{}{}
	}

	allHosts := funk.Keys(allHostsMap).([]string)
	sort.Strings(allHosts)

	return allHosts, nil
}

// fetchAllHostsInfo fetches all hosts and their information.
// Note: The returned data and error may both exist.
func (s *Service) fetchAllHostsInfo(db *gorm.DB) ([]*hostinfo.Info, error) {
	allHosts, err := s.fetchAllInstanceHosts()
	if err != nil {
		return nil, err
	}

	allHostsInfoMap := make(map[string]*hostinfo.Info)
	if e := hostinfo.FillFromClusterLoadTable(db, allHostsInfoMap); e != nil {
		log.Warn("Failed to read cluster_load table", zap.Error(e))
		err = e
	}
	if e := hostinfo.FillFromClusterHardwareTable(db, allHostsInfoMap); e != nil && err == nil {
		log.Warn("Failed to read cluster_hardware table", zap.Error(e))
		err = e
	}
	if e := hostinfo.FillInstances(db, allHostsInfoMap); e != nil && err == nil {
		log.Warn("Failed to fill instances for hosts", zap.Error(e))
		err = e
	}

	r := make([]*hostinfo.Info, 0, len(allHosts))
	for _, host := range allHosts {
		if im, ok := allHostsInfoMap[host]; ok {
			r = append(r, im)
		} else {
			// Missing item
			r = append(r, hostinfo.NewHostInfo(host))
		}
	}
	return r, err
}
