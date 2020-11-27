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

package topology

import (
	"encoding/json"
	"sort"
	"strings"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/host"
)

// FetchStoreTopology returns TiKV info and TiFlash info.
func FetchStoreTopology(pdClient *pd.Client) ([]StoreInfo, []StoreInfo, error) {
	stores, err := fetchStores(pdClient)
	if err != nil {
		return nil, nil, err
	}

	tiKVStores := make([]store, 0, len(stores))
	tiFlashStores := make([]store, 0, len(stores))
	for _, store := range stores {
		isTiFlash := false
		for _, label := range store.Labels {
			if label.Key == "engine" && label.Value == "tiflash" {
				isTiFlash = true
			}
		}
		if isTiFlash {
			tiFlashStores = append(tiFlashStores, store)
		} else {
			tiKVStores = append(tiKVStores, store)
		}
	}

	return buildStoreTopology(tiKVStores), buildStoreTopology(tiFlashStores), nil
}

func FetchStoreLocation(pdClient *pd.Client) (*StoreLocation, error) {
	locationLabels, err := fetchLocationLabels(pdClient)
	if err != nil {
		return nil, err
	}

	stores, err := fetchStores(pdClient)
	if err != nil {
		return nil, err
	}

	nodes := make([]StoreLabels, 0, len(stores))
	for _, s := range stores {
		node := StoreLabels{
			Address: s.Address,
			Labels:  map[string]string{},
		}
		for _, l := range s.Labels {
			node.Labels[l.Key] = l.Value
		}
		nodes = append(nodes, node)
	}

	storeLocation := StoreLocation{
		LocationLabels: locationLabels,
		Stores:         nodes,
	}

	return &storeLocation, nil
}

func buildStoreTopology(stores []store) []StoreInfo {
	nodes := make([]StoreInfo, 0, len(stores))
	for _, v := range stores {
		hostname, port, err := host.ParseHostAndPortFromAddress(v.Address)
		if err != nil {
			log.Warn("Failed to parse store address", zap.Any("store", v))
			continue
		}
		_, statusPort, err := host.ParseHostAndPortFromAddress(v.StatusAddress)
		if err != nil {
			log.Warn("Failed to parse store status address", zap.Any("store", v))
			continue
		}
		// In current TiKV, it's version may not start with 'v',
		// so we may need to add a prefix 'v' for it.
		version := strings.Trim(v.Version, "\n ")
		if !strings.HasPrefix(version, "v") {
			version = "v" + version
		}
		node := StoreInfo{
			Version:        version,
			IP:             hostname,
			Port:           port,
			GitHash:        v.GitHash,
			DeployPath:     v.DeployPath,
			Status:         parseStoreState(v.StateName),
			StatusPort:     statusPort,
			Labels:         map[string]string{},
			StartTimestamp: v.StartTimestamp,
		}
		for _, v := range v.Labels {
			node.Labels[v.Key] = v.Value
		}
		nodes = append(nodes, node)
	}

	return nodes
}

type store struct {
	Address string `json:"address"`
	ID      int    `json:"id"`
	Labels  []struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	} `json:"labels"`
	StateName      string `json:"state_name"`
	Version        string `json:"version"`
	StatusAddress  string `json:"status_address"`
	GitHash        string `json:"git_hash"`
	DeployPath     string `json:"deploy_path"`
	StartTimestamp int64  `json:"start_timestamp"`
}

func fetchStores(pdClient *pd.Client) ([]store, error) {
	data, err := pdClient.SendGetRequest("/stores")
	if err != nil {
		return nil, err
	}

	storeResp := struct {
		Count  int `json:"count"`
		Stores []struct {
			Store store
		} `json:"stores"`
	}{}
	err = json.Unmarshal(data, &storeResp)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "PD stores API unmarshal failed")
	}

	ret := make([]store, 0, storeResp.Count)
	for _, s := range storeResp.Stores {
		ret = append(ret, s.Store)
	}

	sort.Slice(ret, func(i, j int) bool {
		return ret[i].Address < ret[j].Address
	})

	return ret, nil
}

func parseStoreState(state string) ComponentStatus {
	state = strings.Trim(strings.ToLower(state), "\n ")
	switch state {
	case "up":
		return ComponentStatusUp
	case "tombstone":
		return ComponentStatusTombstone
	case "offline":
		return ComponentStatusOffline
	case "down":
		return ComponentStatusDown
	case "disconnected":
		return ComponentStatusUnreachable
	default:
		return ComponentStatusUnreachable
	}
}
