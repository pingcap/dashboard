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

package keyvisual

import (
	"encoding/hex"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/keyvisual/decorator"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/keyvisual/info"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/keyvisual/input"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/keyvisual/matrix"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/keyvisual/storage"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/log"
	"go.uber.org/zap"
)

const (
	maxDisplayY = 1536
)

var (
	defaultStatConfig = storage.StatConfig{
		LayersConfig: []storage.LayerConfig{
			{Len: 60, Ratio: 2 / 1},                     // step 1 minutes, total 60, 1 hours (sum: 1 hours)
			{Len: 60 / 2 * 7, Ratio: 6 / 2},             // step 2 minutes, total 210, 7 hours (sum: 8 hours)
			{Len: 60 / 6 * 16, Ratio: 30 / 6},           // step 6 minutes, total 160, 16 hours (sum: 1 days)
			{Len: 60 / 30 * 24 * 6, Ratio: 4 * 60 / 30}, // step 30 minutes, total 288, 6 days (sum: 1 weeks)
			{Len: 24 / 4 * 28, Ratio: 0},                // step 4 hours, total 168, 4 weeks (sum: 5 weeks)
		},
	}
)

type Service struct {
	config *config.Config

	stat     *storage.Stat
	strategy matrix.Strategy
}

func NewService(cfg *config.Config, db *dbstore.DB) *Service {
	in := input.NewStatInput(cfg)
	labelStrategy := decorator.TiDBLabelStrategy(cfg)
	strategy := matrix.DistanceStrategy(cfg, labelStrategy, 1.0/math.Phi, 15, 50)
	stat := storage.NewStat(cfg, db, defaultStatConfig, strategy, in.GetStartTime())

	cfg.Wg.Add(2)
	go func() {
		labelStrategy.Background()
		cfg.Wg.Done()
	}()
	go func() {
		in.Background(stat)
		cfg.Wg.Done()
	}()

	return &Service{
		config:   cfg,
		stat:     stat,
		strategy: strategy,
	}
}

func (s *Service) Register(r *gin.RouterGroup) {
	endpoint := r.Group("/keyvisual")
	endpoint.GET("/heatmaps", s.heatmapsHandler)
}

// @Summary Key Visual Heatmaps
// @Description Heatmaps in a given range to visualize TiKV usage
// @Produce json
// @Param startkey query string false "The start of the key range"
// @Param endkey query string false "The end of the key range"
// @Param starttime query int false "The start of the time range (Unix)"
// @Param endtime query int false "The end of the time range (Unix)"
// @Param type query string false "Main types of data" Enums(written_bytes, read_bytes, written_keys, read_keys, integration)
// @Success 200 {object} matrix.Matrix
// @Router /keyvisual/heatmaps [get]
func (s *Service) heatmapsHandler(c *gin.Context) {
	startKey := c.Query("startkey")
	endKey := c.Query("endkey")
	startTimeString := c.Query("starttime")
	endTimeString := c.Query("endtime")
	typ := c.Query("type")

	endTime := time.Now()
	startTime := endTime.Add(-360 * time.Minute)
	if startTimeString != "" {
		tsSec, err := strconv.ParseInt(startTimeString, 10, 64)
		if err != nil {
			log.Error("parse ts failed", zap.Error(err))
			c.JSON(http.StatusBadRequest, "bad request")
			return
		}
		startTime = time.Unix(tsSec, 0)
	}
	if endTimeString != "" {
		tsSec, err := strconv.ParseInt(endTimeString, 10, 64)
		if err != nil {
			log.Error("parse ts failed", zap.Error(err))
			c.JSON(http.StatusBadRequest, "bad request")
			return
		}
		endTime = time.Unix(tsSec, 0)
	}
	if !(startTime.Before(endTime) && (endKey == "" || startKey < endKey)) {
		c.JSON(http.StatusBadRequest, "bad request")
		return
	}

	log.Info("Request matrix",
		zap.Time("start-time", startTime),
		zap.Time("end-time", endTime),
		zap.String("start-key", startKey),
		zap.String("end-key", endKey),
		zap.String("type", typ),
	)

	if startKeyBytes, err := hex.DecodeString(startKey); err == nil {
		startKey = string(startKeyBytes)
	} else {
		c.JSON(http.StatusBadRequest, "bad request")
		return
	}
	if endKeyBytes, err := hex.DecodeString(endKey); err == nil {
		endKey = string(endKeyBytes)
	} else {
		c.JSON(http.StatusBadRequest, "bad request")
		return
	}
	baseTag := info.IntoTag(typ)
	plane := s.stat.Range(startTime, endTime, startKey, endKey, baseTag)
	resp := plane.Pixel(s.strategy, maxDisplayY, info.GetDisplayTags(baseTag))
	resp.Range(startKey, endKey)
	// TODO: An expedient to reduce data transmission, which needs to be deleted later.
	resp.DataMap = map[string][][]uint64{
		typ: resp.DataMap[typ],
	}
	// ----------
	c.JSON(http.StatusOK, resp)
}
