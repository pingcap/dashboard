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

package slowquery

import (
	"strings"

	"github.com/pingcap/tidb-dashboard/util/gormutil/virtualview"
	"github.com/thoas/go-funk"
	"gorm.io/gorm"
)

const (
	slowQueryTable = "INFORMATION_SCHEMA.CLUSTER_SLOW_QUERY"
)

type GetListRequest struct {
	BeginTime int      `json:"begin_time" form:"begin_time"`
	EndTime   int      `json:"end_time" form:"end_time"`
	DB        []string `json:"db" form:"db"`
	Limit     int      `json:"limit" form:"limit"`
	Text      string   `json:"text" form:"text"`
	OrderBy   string   `json:"orderBy" form:"orderBy"`
	IsDesc    bool     `json:"desc" form:"desc"`

	// for showing slow queries in the statement detail page
	Plans  []string `json:"plans" form:"plans"`
	Digest string   `json:"digest" form:"digest"`

	Fields string `json:"fields" form:"fields"` // example: "Query,Digest"
}

type GetDetailRequest struct {
	Digest    string  `json:"digest" form:"digest"`
	Timestamp float64 `json:"timestamp" form:"timestamp"`
	// TODO: Switch back to uint64 when modern browser as well as Swagger handles BigInt well.
	ConnectID string `json:"connect_id" form:"connect_id"`
}

func (s *Service) querySlowLogList(db *gorm.DB, vv *virtualview.VirtualView, req *GetListRequest) ([]Model, error) {
	// TODO: get table column names and set source db columns once when service start
	tableColumns, err := s.params.SysSchema.GetTableColumnNames(db, slowQueryTable)
	if err != nil {
		return nil, err
	}
	s.vv.SetSourceDBColumns(tableColumns)
	reqFields := funk.UniqString(append(
		strings.Split(req.Fields, ","),
		// These three fields are the most basic information of a slow query record and should contain them
		"digest",
		"connection_id",
		"timestamp",
	))
	clause := s.vv.Clauses(reqFields)

	// more robust
	if req.OrderBy == "" {
		req.OrderBy = "timestamp"
	}

	tx := db.
		Table(slowQueryTable).
		Clauses(
			clause.Select(),
			clause.OrderBy([]virtualview.OrderByField{{JSONFieldName: req.OrderBy, IsDesc: req.IsDesc}}),
		).
		Where("Time BETWEEN FROM_UNIXTIME(?) AND FROM_UNIXTIME(?)", req.BeginTime, req.EndTime)

	if req.Limit > 0 {
		tx = tx.Limit(req.Limit)
	}

	if req.Text != "" {
		lowerStr := strings.ToLower(req.Text)
		arr := strings.Fields(lowerStr)
		for _, v := range arr {
			tx = tx.Where(
				`Txn_start_ts REGEXP ?
				 OR LOWER(Digest) REGEXP ?
				 OR LOWER(CONVERT(Prev_stmt USING utf8)) REGEXP ?
				 OR LOWER(CONVERT(Query USING utf8)) REGEXP ?`,
				v, v, v, v,
			)
		}
	}

	if len(req.DB) > 0 {
		tx = tx.Where("DB IN (?)", req.DB)
	}

	if len(req.Plans) > 0 {
		tx = tx.Where("Plan_digest IN (?)", req.Plans)
	}

	if len(req.Digest) > 0 {
		tx = tx.Where("Digest = ?", req.Digest)
	}

	var results []Model
	err = tx.Find(&results).Error
	if err != nil {
		return nil, err
	}
	return results, nil
}

func (s *Service) querySlowLogDetail(db *gorm.DB, req *GetDetailRequest) (*Model, error) {
	var result Model
	err := db.
		Table(slowQueryTable).
		Select("*, (UNIX_TIMESTAMP(Time) + 0E0) AS timestamp").
		Where("Digest = ?", req.Digest).
		Where("Time = FROM_UNIXTIME(?)", req.Timestamp).
		Where("Conn_id = ?", req.ConnectID).
		First(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}
