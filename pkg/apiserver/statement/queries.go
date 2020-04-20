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

package statement

import (
	"fmt"
	"regexp"
	"sort"
	"strings"

	"github.com/jinzhu/gorm"
)

const (
	statementsTable = "INFORMATION_SCHEMA.CLUSTER_STATEMENTS_SUMMARY_HISTORY"
)

func QuerySchemas(db *gorm.DB) ([]string, error) {
	sql := `SHOW DATABASES`

	var schemas []string
	err := db.Raw(sql).Pluck("Database", &schemas).Error
	if err != nil {
		return nil, err
	}

	for i, v := range schemas {
		schemas[i] = strings.ToLower(v)
	}
	sort.Strings(schemas)
	return schemas, nil
}

func QueryTimeRanges(db *gorm.DB) (result []*TimeRange, err error) {
	err = db.
		Select(`
			DISTINCT
			FLOOR(UNIX_TIMESTAMP(summary_begin_time)) AS begin_time,
			FLOOR(UNIX_TIMESTAMP(summary_end_time)) AS end_time
		`).
		Table(statementsTable).
		Order("summary_begin_time DESC").
		Find(&result).Error
	return
}

func QueryStmtTypes(db *gorm.DB) (result []string, err error) {
	// why should put DISTINCT inside the `Pluck()` method, see here:
	// https://github.com/jinzhu/gorm/issues/496
	err = db.
		Table(statementsTable).
		Order("stmt_type ASC").
		Pluck("DISTINCT stmt_type", &result).
		Error
	return
}

// Sample params:
// beginTime: 1586844000
// endTime: 1586845800
// schemas: ["tpcc", "test"]
// stmtTypes: ["select", "update"]
func QueryStatementsOverview(
	db *gorm.DB,
	beginTime, endTime int64,
	schemas, stmtTypes []string) (result []*Overview, err error) {
	query := db.
		Select(`
			schema_name,
			digest,
			digest_text,
			SUM(sum_latency) AS agg_sum_latency,
			SUM(exec_count) AS agg_exec_count,
			ROUND(SUM(exec_count *  avg_affected_rows) / SUM(exec_count)) AS agg_avg_affected_rows,
			MAX(max_latency) AS agg_max_latency,
			ROUND(SUM(exec_count * avg_latency) / SUM(exec_count)) AS agg_avg_latency,
			MIN(min_latency) AS agg_min_latency,
			ROUND(SUM(exec_count * avg_mem) / SUM(exec_count)) AS agg_avg_mem,
			MAX(max_mem) AS agg_max_mem,
			GROUP_CONCAT(table_names) AS agg_table_names
		`).
		Table(statementsTable).
		Where("UNIX_TIMESTAMP(summary_begin_time) >= ? AND UNIX_TIMESTAMP(summary_end_time) <= ?", beginTime, endTime).
		Group("schema_name, digest, digest_text").
		Order("agg_sum_latency DESC")

	if len(schemas) > 0 {
		regex := make([]string, 0, len(schemas))
		for _, schema := range schemas {
			regex = append(regex, fmt.Sprintf("\\b%s\\.", regexp.QuoteMeta(schema)))
		}
		regexAll := strings.Join(regex, "|")
		query = query.Where("table_names REGEXP ?", regexAll)
	}

	if len(stmtTypes) > 0 {
		query = query.Where("stmt_type in (?)", stmtTypes)
	}

	err = query.Find(&result).Error
	return
}

// Sample params:
// schemas: "tpcc"
// beginTime: 1586844000
// endTime: 1586845800
// digest: "bcaa7bdb37e24d03fb48f20cc32f4ff3f51c0864dc378829e519650df5c7b923"
func QueryStatementDetail(db *gorm.DB, schema, digest string, beginTime, endTime int64) (*Detail, error) {
	result := &Detail{}

	query := db.
		Select(`
			schema_name,
			digest,
			digest_text,
			SUM(sum_latency) AS agg_sum_latency,
			SUM(exec_count) AS agg_exec_count,
			ROUND(SUM(exec_count * avg_affected_rows) / SUM(exec_count)) AS agg_avg_affected_rows,
			ROUND(SUM(exec_count * avg_total_keys) / SUM(exec_count)) AS agg_avg_total_keys,
			GROUP_CONCAT(table_names) AS agg_table_names
		`).
		Table(statementsTable).
		Where("schema_name = ?", schema).
		Where("UNIX_TIMESTAMP(summary_begin_time) >= ? AND UNIX_TIMESTAMP(summary_end_time) <= ?", beginTime, endTime).
		Where("digest = ?", digest).
		Group("digest, digest_text, schema_name")

	if err := query.Scan(&result).Error; err != nil {
		return nil, err
	}

	query = db.
		Select(`query_sample_text, last_seen`).
		Table(statementsTable).
		Where("schema_name = ?", schema).
		Where("UNIX_TIMESTAMP(summary_begin_time) >= ? AND UNIX_TIMESTAMP(summary_end_time) <= ?", beginTime, endTime).
		Where("digest = ?", digest).
		Order("last_seen DESC")

	if err := query.First(&result).Error; err != nil {
		return nil, err
	}

	query = db.
		Select(`
			plan_digest,
			plan
		`).
		Table(statementsTable).
		Where("schema_name = ?", schema).
		Where("UNIX_TIMESTAMP(summary_begin_time) >= ? AND UNIX_TIMESTAMP(summary_end_time) <= ?", beginTime, endTime).
		Where("digest = ?", digest).
		Where("plan_digest != ''").
		Group("plan_digest, plan")

	if err := query.Find(&result.Plans).Error; err != nil {
		return nil, err
	}

	return result, nil
}

// Sample params:
// schemas: "tpcc"
// beginTime: 1586844000
// endTime: 1586845800
// digest: "bcaa7bdb37e24d03fb48f20cc32f4ff3f51c0864dc378829e519650df5c7b923"
func QueryStatementNodes(db *gorm.DB, schema, digest string, beginTime, endTime int64) (result []*Node, err error) {
	err = db.
		Select(`
			instance,
			sum_latency,
			exec_count,
			avg_latency,
			max_latency,
			avg_mem,
			sum_backoff_times
		`).
		Table(statementsTable).
		Where("schema_name = ?", schema).
		Where("UNIX_TIMESTAMP(summary_begin_time) >= ? AND UNIX_TIMESTAMP(summary_end_time) <= ?", beginTime, endTime).
		Where("digest = ?", digest).
		Order("sum_latency DESC").
		Find(&result).Error
	return
}
