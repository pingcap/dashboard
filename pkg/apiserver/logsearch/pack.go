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

package logsearch

import (
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
)

func serveTaskForDownload(task *TaskModel, c *gin.Context) {
	logPath := task.LogStorePath
	if logPath == nil {
		logPath = task.SlowLogStorePath
	}
	if logPath == nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(utils.ErrInvalidRequest.New("Log is not available"))
		return
	}
	c.FileAttachment(*logPath, fmt.Sprintf("logs-%s.zip", task.Target.FileName()))
}

func serveMultipleTaskForDownload(tasks []*TaskModel, c *gin.Context) {
	filePaths := make([]string, 0, len(tasks))
	for _, task := range tasks {
		logPath := task.LogStorePath
		if logPath == nil {
			logPath = task.SlowLogStorePath
		}
		if logPath == nil {
			c.Status(http.StatusInternalServerError)
			_ = c.Error(utils.ErrInvalidRequest.New("Some logs are not available"))
			return
		}
		filePaths = append(filePaths, *logPath)
	}

	temp, err := ioutil.TempFile("", "logs")
	if err != nil {
		c.Status(http.StatusInternalServerError)
		_ = c.Error(err)
		return
	}
	defer temp.Close()

	err = utils.CreateZipPack(temp, filePaths, false)
	if err != nil {
		c.Status(http.StatusInternalServerError)
		_ = c.Error(err)
		return
	}

	c.FileAttachment(temp.Name(), "logs.zip")
}
