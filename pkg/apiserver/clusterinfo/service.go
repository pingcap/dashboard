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

// clusterinfo is a directory for ClusterInfoServer, which could load topology from pd
// using Etcd v3 interface and pd interface.

package clusterinfo

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"

	"github.com/gin-gonic/gin"
	pdclient "github.com/pingcap/pd/client"
	etcdclientv3 "go.etcd.io/etcd/clientv3"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/clusterinfo"
)

type ClusterInfo struct {
	TiDB         []clusterinfo.TiDB       `json:"tidb"`
	TiKV         []clusterinfo.TiKV       `json:"tikv"`
	Pd           []clusterinfo.PD         `json:"pd"`
	Grafana      clusterinfo.Grafana      `json:"grafana"`
	AlertManager clusterinfo.AlertManager `json:"alert_manager"`
}

type Service struct {
	config  *config.Config
	etcdCli *etcdclientv3.Client
	pdCli   pdclient.Client
}

func NewService(config *config.Config, pdClient pdclient.Client, etcdClient *etcdclientv3.Client) *Service {
	return &Service{etcdCli: etcdClient, config: config, pdCli: pdClient}
}

func (s *Service) Register(r *gin.RouterGroup, auth *user.AuthService) {
	endpoint := r.Group("/topology")
	//endpoint.Use(auth.MWAuthRequired())
	endpoint.GET("/", s.topologyHandler)
	endpoint.DELETE("/tidb/:address/", s.deleteDBHandler)
}

// @Summary Delete tidb ns.
// @Description Delete TiDB with ip:port
// @Produce json
// @Success 204  Delete successfully and return 204.
// @Failure 404  The key doesn't exists.
// @Router /topology/address [delete]
func (s *Service) deleteDBHandler(c *gin.Context) {
	v, exists := c.Params.Get("address")
	if !exists {
		c.Status(500)
		_ = c.Error(fmt.Errorf("address not exists in path"))
		return
	}
	address := v
	ttlKey := fmt.Sprintf("/topology/tidb/%v/ttl", address)
	nonTTLKey := fmt.Sprintf("/topology/tidb/%v/info", address)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	_, err := s.etcdCli.Delete(ctx, nonTTLKey)
	if err != nil {
		c.Status(500)
		_ = c.Error(err)
		return
	}
	_, err = s.etcdCli.Delete(ctx, ttlKey)
	if err != nil {
		c.Status(500)
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

type ResponseWithErr struct {
	TiDB         interface{} `json:"tidb"`
	TiKV         interface{} `json:"tikv"`
	Pd           interface{} `json:"pd"`
	Grafana      interface{} `json:"grafana"`
	AlertManager interface{} `json:"alert_manager"`
}

// @Summary Dashboard info
// @Description Get information about the dashboard service.
// @Produce json
// @Success 200 {object} ClusterInfo
// @Router /topology [get]
func (s *Service) topologyHandler(c *gin.Context) {
	var info ClusterInfo
	var returnObject ResponseWithErr
	errMap := map[string]error{}
	var errMutex sync.Mutex

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	fetchers := []fetcher{
		tidbFetcher{},
		tikvFetcher{},
		pdFetcher{},
	}

	var wg sync.WaitGroup
	for _, fetcher := range fetchers {
		wg.Add(1)
		currentFetcher := fetcher
		go func() {
			defer wg.Done()
			err := currentFetcher.fetch(ctx, &info, s)
			if err != nil {
				errMutex.Lock()
				errMap[currentFetcher.name()] = err
				errMutex.Unlock()
			}
		}()
	}
	wg.Wait()
	var exists bool
	var err error

	if err, exists = errMap["tikv"]; exists {
		// err must exists and not nil
		returnObject.TiKV = struct {
			Error string `json:"error"`
		}{Error: err.Error()}
	} else {
		returnObject.TiKV = info.TiKV
	}
	if err, exists = errMap["tidb"]; exists {
		// err must exists and not nil
		errStruct := struct {
			Error string `json:"error"`
		}{Error: err.Error()}
		returnObject.TiDB = errStruct
		returnObject.AlertManager = errStruct
	} else {
		returnObject.TiDB = info.TiDB
		returnObject.AlertManager = info.AlertManager
		returnObject.Grafana = info.Grafana
	}
	if err, exists = errMap["pd"]; exists {
		// err must exists and not nil
		returnObject.Pd = struct {
			Error string `json:"error"`
		}{Error: err.Error()}
	} else {
		returnObject.Pd = info.Pd
	}

	c.JSON(http.StatusOK, returnObject)
}
