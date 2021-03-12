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

package storage

import (
	"path"
	"testing"
	"time"

	"github.com/jinzhu/gorm"
	. "github.com/pingcap/check"

	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/matrix"
)

func TestDbstore(t *testing.T) {
	TestingT(t)
}

var _ = Suite(&testDbstoreSuite{})

type testDbstoreSuite struct {
	dir string
	db  *dbstore.DB
}

func (t *testDbstoreSuite) SetUpTest(c *C) {
	t.dir = c.MkDir()
	gormDB, err := gorm.Open("sqlite3", path.Join(t.dir, "test.sqlite.db"))
	if err != nil {
		c.Errorf("Open %s error: %v", path.Join(t.dir, "test.sqlite.db"), err)
	}
	t.db = &dbstore.DB{DB: gormDB}
}

func (t *testDbstoreSuite) TearDownTest(c *C) {
	_ = t.db.Close()
}

func (t *testDbstoreSuite) TestCreateTableAxisModelIfNotExists(c *C) {
	isExist, err := CreateTableAxisModelIfNotExists(t.db)
	c.Assert(isExist, Equals, false)
	c.Assert(err, IsNil)
	isExist, err = CreateTableAxisModelIfNotExists(t.db)
	c.Assert(isExist, Equals, true)
	c.Assert(err, IsNil)
}

func (t *testDbstoreSuite) TestClearTableAxisModel(c *C) {
	_, err := CreateTableAxisModelIfNotExists(t.db)
	if err != nil {
		c.Fatalf("Create table AxisModel error: %v", err)
	}
	axisModel, err := NewAxisModel(0, time.Now(), matrix.Axis{})
	if err != nil {
		c.Fatalf("NewAxisModel error: %v", err)
	}
	err = axisModel.Insert(t.db)
	if err != nil {
		c.Fatalf("AxisModel Insert error: %v", err)
	}
	var count int

	err = t.db.Table(tableAxisModelName).Count(&count).Error
	if err != nil {
		c.Fatalf("Count table AxisModel error: %v", err)
	}
	c.Assert(count, Equals, 1)

	err = ClearTableAxisModel(t.db)
	c.Assert(err, IsNil)

	err = t.db.Table(tableAxisModelName).Count(&count).Error
	if err != nil {
		c.Fatalf("Count table AxisModel error: %v", err)
	}
	c.Assert(count, Equals, 0)
}

func (t *testDbstoreSuite) TestAxisModelFunc(c *C) {
	_, err := CreateTableAxisModelIfNotExists(t.db)
	if err != nil {
		c.Fatalf("Create table AxisModel error: %v", err)
	}
	var layerNum uint8 = 0
	endTime := time.Now()
	axis := matrix.Axis{
		Keys:       []string{"a", "b"},
		ValuesList: [][]uint64{{1}, {1}, {1}, {1}},
	}
	axisModel, err := NewAxisModel(layerNum, endTime, axis)
	if err != nil {
		c.Fatalf("NewAxisModel error: %v", err)
	}
	err = axisModel.Insert(t.db)
	c.Assert(err, IsNil)
	axisModels, err := FindAxisModelsOrderByTime(t.db, layerNum)
	if err != nil {
		c.Fatalf("FindAxisModelOrderByTime error: %v", err)
	}
	c.Assert(len(axisModels), Equals, 1)
	axisModelDeepEqual(axisModels[0], axisModel, c)
	obtainedAxis, err := axisModels[0].UnmarshalAxis()
	if err != nil {
		c.Fatalf("UnmarshalAxis error: %v", err)
	}
	c.Assert(obtainedAxis, DeepEquals, axis)

	err = axisModel.Delete(t.db)
	c.Assert(err, IsNil)

	var count int
	err = t.db.Table(tableAxisModelName).Count(&count).Error
	if err != nil {
		c.Fatalf("Count table AxisModel error: %v", err)
	}
	c.Assert(count, Equals, 0)

	err = axisModel.Delete(t.db)
	c.Assert(err, IsNil)
}

func (t *testDbstoreSuite) TestAxisModelsFindAndDelete(c *C) {
	_, err := CreateTableAxisModelIfNotExists(t.db)
	if err != nil {
		c.Fatalf("Create table AxisModel error: %v", err)
	}

	var maxLayerNum uint8 = 2
	var axisModelNumEachLayer = 3
	var axisModelList = make([][]*AxisModel, maxLayerNum)
	for layerNum := uint8(0); layerNum < maxLayerNum; layerNum++ {
		axisModelList[layerNum] = make([]*AxisModel, axisModelNumEachLayer)
		for i := 0; i < axisModelNumEachLayer; i++ {
			axisModelList[layerNum][i], err = NewAxisModel(layerNum, time.Now(), matrix.Axis{})
			if err != nil {
				c.Fatalf("NewAxisModel error: %v", err)
			}
			err = axisModelList[layerNum][i].Insert(t.db)
			if err != nil {
				c.Fatalf("NewAxisModel error: %v", err)
			}
		}
	}

	var count int
	err = t.db.Table(tableAxisModelName).Count(&count).Error
	if err != nil {
		c.Fatalf("Count table AxisModel error: %v", err)
	}
	c.Assert(count, Equals, int(maxLayerNum)*axisModelNumEachLayer)

	findLayerNum := maxLayerNum - 1
	axisModels, err := FindAxisModelsOrderByTime(t.db, findLayerNum)
	c.Assert(err, IsNil)
	axisModelsDeepEqual(axisModels, axisModelList[findLayerNum], c)

	err = DeleteAxisModelsByLayerNum(t.db, findLayerNum)
	c.Assert(err, IsNil)

	axisModels, err = FindAxisModelsOrderByTime(t.db, findLayerNum)
	c.Assert(err, IsNil)
	c.Assert(axisModels, HasLen, 0)

	err = t.db.Table(tableAxisModelName).Count(&count).Error
	if err != nil {
		c.Fatalf("Count table AxisModel error: %v", err)
	}
	c.Assert(count, Equals, int(maxLayerNum-1)*axisModelNumEachLayer)
}

func axisModelsDeepEqual(obtainedAxisModels []*AxisModel, expectedAxisModels []*AxisModel, c *C) {
	c.Assert(len(obtainedAxisModels), Equals, len(expectedAxisModels))
	for i := range obtainedAxisModels {
		axisModelDeepEqual(obtainedAxisModels[i], expectedAxisModels[i], c)
	}
}

func axisModelDeepEqual(obtainedAxisModel *AxisModel, expectedAxisModel *AxisModel, c *C) {
	c.Assert(obtainedAxisModel.Time.Unix(), Equals, expectedAxisModel.Time.Unix())
	obtainedAxisModel.Time = expectedAxisModel.Time
	c.Assert(obtainedAxisModel, DeepEquals, expectedAxisModel)
}
