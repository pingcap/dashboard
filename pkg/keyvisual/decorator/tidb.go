// Copyright 2019 PingCAP, Inc.
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

package decorator

import (
	"context"
	"encoding/hex"
	"fmt"
	"sync"
	"time"

	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/region"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/tidb/model"
)

type tableDetail struct {
	Name    string
	DB      string
	ID      int64
	Indices map[int64]string
}

type tidbLabelStrategy struct {
	Config     *config.Config
	EtcdClient *clientv3.Client

	TableMap      sync.Map
	tidbClient    *tidb.Client
	SchemaVersion int64
	TidbAddress   []string
}

// TiDBLabelStrategy implements the LabelStrategy interface. Get Label Information from TiDB.
func TiDBLabelStrategy(lc fx.Lifecycle, wg *sync.WaitGroup, cfg *config.Config, etcdClient *clientv3.Client, tidbClient *tidb.Client) LabelStrategy {
	s := &tidbLabelStrategy{
		Config:        cfg,
		EtcdClient:    etcdClient,
		tidbClient:    tidbClient,
		SchemaVersion: -1,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			wg.Add(1)
			go func() {
				defer wg.Done()
				s.Background(ctx)
			}()
			return nil
		},
	})

	return s
}

func (s *tidbLabelStrategy) ReloadConfig(cfg *config.KeyVisualConfig) {
}

func (s *tidbLabelStrategy) Background(ctx context.Context) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.updateMap(ctx)
		}
	}
}

// CrossBorder does not allow cross tables or cross indexes within a table.
func (s *tidbLabelStrategy) CrossBorder(startKey, endKey string) bool {
	startBytes, endBytes := model.Key(region.Bytes(startKey)), model.Key(region.Bytes(endKey))
	startIsMeta, startTableID := startBytes.MetaOrTable()
	endIsMeta, endTableID := endBytes.MetaOrTable()
	if startIsMeta || endIsMeta {
		return startIsMeta != endIsMeta
	}
	if startTableID != endTableID {
		return true
	}
	startIndex := startBytes.IndexID()
	endIndex := endBytes.IndexID()
	return startIndex != endIndex
}

// Label will parse the ID information of the table and index.
func (s *tidbLabelStrategy) Label(key string) (label LabelKey) {
	keyBytes := region.Bytes(key)
	label.Key = hex.EncodeToString(keyBytes)
	decodeKey := model.Key(keyBytes)
	isMeta, TableID := decodeKey.MetaOrTable()
	if isMeta {
		label.Labels = append(label.Labels, "meta")
	} else if v, ok := s.TableMap.Load(TableID); ok {
		detail := v.(*tableDetail)
		label.Labels = append(label.Labels, detail.DB, detail.Name)
		if rowID := decodeKey.RowID(); rowID != 0 {
			label.Labels = append(label.Labels, fmt.Sprintf("row_%d", rowID))
		} else if indexID := decodeKey.IndexID(); indexID != 0 {
			label.Labels = append(label.Labels, detail.Indices[indexID])
		}
	} else {
		label.Labels = append(label.Labels, fmt.Sprintf("table_%d", TableID))
		if rowID := decodeKey.RowID(); rowID != 0 {
			label.Labels = append(label.Labels, fmt.Sprintf("row_%d", rowID))
		} else if indexID := decodeKey.IndexID(); indexID != 0 {
			label.Labels = append(label.Labels, fmt.Sprintf("index_%d", indexID))
		}
	}
	return
}

var globalStart = LabelKey{
	Key:    "",
	Labels: []string{"meta"},
}

var globalEnd = LabelKey{
	Key:    "",
	Labels: []string{},
}

func (s *tidbLabelStrategy) LabelGlobalStart() LabelKey {
	return globalStart
}

func (s *tidbLabelStrategy) LabelGlobalEnd() LabelKey {
	return globalEnd
}
