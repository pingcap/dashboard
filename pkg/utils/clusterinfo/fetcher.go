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
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"

	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
)

const prefix = "/topology"

// GetTopology return error only when fetch etcd failed.
func GetTopologyUnderEtcd(ctx context.Context, etcdcli *clientv3.Client) ([]TiDB, *Grafana,
	*AlertManager, error) {
	resp, err := etcdcli.Get(ctx, prefix, clientv3.WithPrefix())
	if err != nil {
		// put error in ctx and return
		return nil, nil, nil, err
	}
	var grafana Grafana
	var alertManager AlertManager
	grafanaExists := false
	amExists := false
	ttlMap := map[string][]byte{}
	infoMap := map[string]*TiDB{}
	for _, kvs := range resp.Kvs {
		key := string(kvs.Key)

		keyParts := strings.Split(key, "/")[1:]
		if len(keyParts) < 2 {
			continue
		}
		// There can be four kinds of keys:
		// * /topology/grafana: stores grafana topology info.
		// * /topology/alertmanager: stores alertmanager topology info.
		// * /topology/tidb/ip:port/info: stores tidb topology info.
		// * /topology/tidb/ip:port/ttl : stores tidb last update ttl time.
		switch keyParts[1] {
		case "grafana":
			if err = json.Unmarshal(kvs.Value, &grafana); err != nil {
				log.Warn("/topology/grafana key unmarshal errors", zap.Error(err))
				continue
			}
			grafanaExists = true
		case "alertmanager":
			if err = json.Unmarshal(kvs.Value, &alertManager); err != nil {
				log.Warn("/topology/alertmanager key unmarshal errors", zap.Error(err))
				continue
			}
			amExists = true
		case "tidb":
			// the key should be like /topology/tidb/ip:port/info or /ttl
			if len(keyParts) != 4 {
				log.Warn("error, key under `/topology/tidb` should be like" +
					" `/topology/tidb/ip:port/info`")
				continue
			}
			address, fieldType := keyParts[2], keyParts[3]
			fillDBMap(address, fieldType, kvs.Value, infoMap, ttlMap)
		}
	}
	var grafanaRet *Grafana
	var alertManagerRet *AlertManager
	if grafanaExists {
		grafanaRet = &grafana
	}
	if amExists {
		alertManagerRet = &alertManager
	}

	return genDBList(infoMap, ttlMap), grafanaRet, alertManagerRet, nil
}

func GetTiDBTopology(ctx context.Context, etcdcli *clientv3.Client) ([]TiDB, error) {
	resp, err := etcdcli.Get(ctx, prefix+"/tidb", clientv3.WithPrefix())
	if err != nil {
		return nil, err
	}
	ttlMap := map[string][]byte{}
	infoMap := map[string]*TiDB{}
	for _, kvs := range resp.Kvs {
		key := string(kvs.Key)

		keyParts := strings.Split(key, "/")[2:]
		if len(keyParts) < 2 {
			continue
		}
		address, fieldType := keyParts[0], keyParts[1]
		fillDBMap(address, fieldType, kvs.Value, infoMap, ttlMap)
	}

	return genDBList(infoMap, ttlMap), nil
}

// address should be like "ip:port"
// fieldType should be "ttl" or "info"
// value is field value.
func fillDBMap(address, fieldType string, value []byte, infoMap map[string]*TiDB, ttlMap map[string][]byte) {
	if fieldType == "ttl" {
		ttlMap[address] = value
	} else if fieldType == "info" {
		var currentInfo TiDB
		err := json.Unmarshal(value, &currentInfo)
		if err != nil {
			return
		}
		host, port, err := parseHostAndPortFromAddress(address)
		if err != nil {
			return
		}
		currentInfo.IP = host
		currentInfo.Port = port
		infoMap[address] = &currentInfo
	}
}

func genDBList(infoMap map[string]*TiDB, ttlMap map[string][]byte) []TiDB {
	dbList := []TiDB{}
	// Note: it means this TiDB has non-ttl key, but ttl-key not exists.
	for address, info := range infoMap {
		if ttlFreshUnixNanoSec, ok := ttlMap[address]; ok {
			unixNano, err := strconv.ParseInt(string(ttlFreshUnixNanoSec), 10, 64)
			if err != nil {
				info.ServerStatus = Offline
			} else {
				ttlFreshTime := time.Unix(0, unixNano)
				if time.Since(ttlFreshTime) > time.Second*45 {
					info.ServerStatus = Offline
				} else {
					info.ServerStatus = Up
				}
			}
		} else {
			info.ServerStatus = Offline
		}
		dbList = append(dbList, *info)
	}

	return dbList
}

type store struct {
	Address string `json:"address"`
	ID      int    `json:"id"`
	Labels  []struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	}
	StateName     string `json:"state_name"`
	Version       string `json:"version"`
	StatusAddress string `json:"status_address"`
	GitHash       string `json:"git_hash"`
	BinaryPath    string `json:"binary_path"`
}

func getAllStores(endpoint string, httpClient *http.Client) ([]store, error) {
	resp, err := httpClient.Get(endpoint + "/pd/api/v1/stores")
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("fetch stores got wrong status code")
	}
	defer resp.Body.Close()
	storeResp := struct {
		Count  int `json:"count"`
		Stores []struct {
			Store store
		} `json:"stores"`
	}{}
	data, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(data, &storeResp)
	if err != nil {
		return nil, err
	}
	ret := make([]store, storeResp.Count)
	for i, s := range storeResp.Stores {
		ret[i] = s.Store
	}
	return ret, nil
}

func GetTiKVTopology(ctx context.Context, endpoint string, httpClient *http.Client) ([]TiKV, error) {
	kvs := make([]TiKV, 0)
	stores, err := getAllStores(endpoint, httpClient)

	if err != nil {
		return nil, err
	}
	for _, v := range stores {
		// parse ip and port
		host, port, err := parseHostAndPortFromAddress(v.Address)
		if err != nil {
			continue
		}
		_, statusPort, err := parseHostAndPortFromAddress(v.StatusAddress)
		if err != nil {
			continue
		}
		currentInfo := TiKV{
			ComponentVersionInfo: ComponentVersionInfo{
				Version: v.Version,
				GitHash: v.GitHash,
			},
			IP:           host,
			Port:         port,
			BinaryPath:   v.BinaryPath,
			ServerStatus: storeStateToStatus(v.StateName),
			StatusPort:   statusPort,
			Labels:       map[string]string{},
		}
		for _, v := range v.Labels {
			currentInfo.Labels[v.Key] = currentInfo.Labels[v.Value]
		}
		kvs = append(kvs, currentInfo)
	}

	return kvs, nil
}

func GetPDTopology(ctx context.Context, pdEndPoint string, httpClient *http.Client) ([]PD, error) {
	pdPeers := make([]PD, 0)
	healthMapChan := make(chan map[string]struct{})
	go func() {
		var err error
		healthMap, err := getPDNodesHealth(pdEndPoint, httpClient)
		if err != nil {
			healthMap = map[string]struct{}{}
		}
		healthMapChan <- healthMap
	}()

	resp, err := httpClient.Get(pdEndPoint + "/pd/api/v1/members")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("fetch PD members got wrong status code")
	}
	data, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		return nil, err
	}

	ds := struct {
		Count   int `json:"count"`
		Members []struct {
			ClientUrls    []string    `json:"client_urls"`
			BinaryPath    string      `json:"binary_path"`
			BinaryVersion string      `json:"binary_version"`
			MemberID      json.Number `json:"member_id"`
		} `json:"members"`
	}{}

	err = json.Unmarshal(data, &ds)
	if err != nil {
		return nil, err
	}

	healthMap := <-healthMapChan
	close(healthMapChan)
	for _, ds := range ds.Members {
		log.Info(ds.ClientUrls[0])
		host, port, err := parseHostAndPortFromAddressURL(ds.ClientUrls[0])
		if err != nil {
			continue
		}
		var storeStatus ComponentStatus
		if _, ok := healthMap[ds.MemberID.String()]; ok {
			storeStatus = Up
		} else {
			storeStatus = Offline
		}

		pdPeers = append(pdPeers, PD{
			ComponentVersionInfo: ComponentVersionInfo{
				Version: ds.BinaryVersion,
			},
			IP:           host,
			Port:         port,
			BinaryPath:   ds.BinaryPath,
			ServerStatus: storeStatus,
		})
	}
	return pdPeers, nil
}

// address should be like "ip:port" as "127.0.0.1:2379".
// return error if string is not like "ip:port".
func parseHostAndPortFromAddress(address string) (string, uint, error) {
	log.Info(address)
	addresses := strings.Split(address, ":")
	if len(addresses) != 2 {
		log.Warn("parseHostAndPortFromAddress receive format error")
		return "", 0, fmt.Errorf("format error")
	}
	port, err := strconv.Atoi(addresses[1])
	if err != nil {
		return "", 0, err
	}
	return addresses[0], uint(port), nil
}

// address should be like "protocol://ip:port" as "http://127.0.0.1:2379".
func parseHostAndPortFromAddressURL(urlString string) (string, uint, error) {
	u, err := url.Parse(urlString)
	if err != nil {
		return "", 0, err
	}
	port, err := strconv.Atoi(u.Port())
	if err != nil {
		return "", 0, err
	}
	return u.Host, uint(port), nil
}

func storeStateToStatus(state string) ComponentStatus {
	state = strings.Trim(strings.ToLower(state), "\n ")
	switch state {
	case "up":
		return Up
	case "offline":
		return Offline
	case "tombstone":
		return Tombstone
	default:
		return Unknown
	}
}

func getPDNodesHealth(pdEndPoint string, httpClient *http.Client) (map[string]struct{}, error) {
	// health member set
	healthMember := map[string]struct{}{}
	resp, err := httpClient.Get(pdEndPoint + "/pd/api/v1/health")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	data, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		return nil, err
	}

	var healths []struct {
		MemberID json.Number `json:"member_id"`
	}

	err = json.Unmarshal(data, &healths)
	if err != nil {
		return nil, err
	}

	for _, v := range healths {
		healthMember[v.MemberID.String()] = struct{}{}
	}
	return healthMember, nil
}
