// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"fmt"
	"io/ioutil"
	"strconv"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

type pprofOptions struct {
	duration           uint
	fileNameWithoutExt string

	target  *model.RequestTargetNode
	fetcher *profileFetcher
}

func fetchPprof(op *pprofOptions) (string, TaskProfileOutputType, error) {
	fetcher := &fetcher{profileFetcher: op.fetcher, target: op.target}
	tmpPath, profileOutputType, err := fetcher.FetchAndWriteToFile(op.duration, op.fileNameWithoutExt)
	if err != nil {
		return "", "", fmt.Errorf("failed to fetch annd write to temp file: %v", err)
	}

	return tmpPath, profileOutputType, nil
}

type fetcher struct {
	target         *model.RequestTargetNode
	profileFetcher *profileFetcher
}

func (f *fetcher) FetchAndWriteToFile(duration uint, fileNameWithoutExt string) (string, TaskProfileOutputType, error) {
	tmpfile, err := ioutil.TempFile("", fileNameWithoutExt)
	if err != nil {
		return "", "", fmt.Errorf("failed to create tmpPath to write profile: %v", err)
	}

	defer func() {
		if err := tmpfile.Close(); err != nil {
			fmt.Printf("failed to close file, %v", err)
		}
	}()

	secs := strconv.Itoa(int(duration))
	url := "/debug/pprof/profile?seconds=" + secs

	resp, err := (*f.profileFetcher).fetch(&fetchOptions{ip: f.target.IP, port: f.target.Port, path: url})
	if err != nil {
		return "", "", fmt.Errorf("failed to fetch profile with proto format: %v", err)
	}

	_, err = tmpfile.Write(resp)
	if err != nil {
		return "", "", fmt.Errorf("failed to write profile: %v", err)
	}

	return tmpfile.Name(), ProfilingOutputTypeProtobuf, nil
}
