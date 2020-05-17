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
	"archive/tar"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
)

func packLogsAsTarball(tasks []*TaskModel, w io.Writer) {
	tw := tar.NewWriter(w)
	defer tw.Close()

	for _, task := range tasks {
		if task.LogStorePath == nil && task.SlowLogStorePath == nil {
			continue
		}
		if task.LogStorePath != nil {
			if err := dumpLog(*task.LogStorePath, tw); err != nil {
				log.Warn("Failed to pack log",
					zap.Any("task", task),
					zap.Error(err))
				continue
			}
		}
		if task.SlowLogStorePath != nil {
			if err := dumpLog(*task.SlowLogStorePath, tw); err != nil {
				log.Warn("Failed to pack slow log",
					zap.Any("task", task),
					zap.Error(err))
				continue
			}
		}
	}
}

func dumpLog(savedPath string, tw *tar.Writer) error {
	f, err := os.Open(savedPath)
	if err != nil {
		return err
	}
	defer f.Close()
	fi, err := f.Stat()
	if err != nil {
		return err
	}
	err = tw.WriteHeader(&tar.Header{
		Name:    path.Base(savedPath),
		Mode:    int64(fi.Mode()),
		ModTime: fi.ModTime(),
		Size:    fi.Size(),
	})
	if err != nil {
		return err
	}

	_, err = io.Copy(tw, f)
	if err != nil {
		return err
	}
	return nil
}

func serveTaskForDownload(task *TaskModel, c *gin.Context) {
	if task.LogStorePath == nil && task.SlowLogStorePath == nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(utils.ErrInvalidRequest.New("Log is not available"))
		return
	}
	reader, writer := io.Pipe()
	go func() {
		defer writer.Close()
		packLogsAsTarball([]*TaskModel{task}, writer)
	}()
	contentType := "application/tar"
	extraHeaders := map[string]string{
		"Content-Disposition": fmt.Sprintf(`attachment; filename="logs-%s.tar"`, task.Target.FileName()),
	}
	c.DataFromReader(http.StatusOK, -1, contentType, reader, extraHeaders)
}

func serveMultipleTaskForDownload(tasks []*TaskModel, c *gin.Context) {
	reader, writer := io.Pipe()
	go func() {
		defer writer.Close()
		packLogsAsTarball(tasks, writer)
	}()
	contentType := "application/tar"
	extraHeaders := map[string]string{
		"Content-Disposition": `attachment; filename="logs.tar"`,
	}
	c.DataFromReader(http.StatusOK, -1, contentType, reader, extraHeaders)
}
