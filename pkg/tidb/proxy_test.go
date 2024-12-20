// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package tidb

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestProxy(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	want := "hello proxy"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, err := w.Write([]byte(want))
		if err != nil {
			t.Fatal(err)
		}
	}))
	defer server.Close()
	u, err := url.Parse(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	p := newProxy(l, map[string]string{"test": fmt.Sprintf("%s:%s", u.Hostname(), u.Port())}, 0, 0)
	ctx, cancel := context.WithCancel(context.Background())
	wg := &sync.WaitGroup{}
	wg.Add(1)
	go p.run(ctx, wg)
	defer cancel()

	u.Host = l.Addr().String()
	res, err := http.Get(u.String())
	if err != nil {
		t.Fatal(err)
	}
	got, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}
	assert.Equal(t, want, string(got))
}

func TestProxyPick(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	n := 3
	responseData := "test"
	endpoints := make(map[string]string)
	picked := make(map[int]bool)
	servers := make(map[int]*httptest.Server)
	var currentPicked int
	for i := 0; i < n; i++ {
		idx := i
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			picked[idx] = true
			currentPicked = idx
			_, err := w.Write([]byte(responseData))
			if err != nil {
				t.Fatal(err)
			}
		}))
		defer server.Close()
		u, err := url.Parse(server.URL)
		if err != nil {
			t.Fatal(err)
		}
		key := strconv.Itoa(i)
		endpoint := fmt.Sprintf("%s:%s", u.Hostname(), u.Port())
		endpoints[key] = endpoint
		servers[idx] = server
	}
	p := newProxy(l, endpoints, 0, 0)
	ctx, cancel := context.WithCancel(context.Background())
	wg := &sync.WaitGroup{}
	wg.Add(1)
	go p.run(ctx, wg)
	defer cancel()

	for i := 0; i < n; i++ {
		client := &http.Client{}
		res, err := client.Get("http://" + l.Addr().String())
		if err != nil {
			t.Fatal(err)
		}
		_, err = io.ReadAll(res.Body)
		if err != nil {
			t.Fatal(err)
		}
		// close conn manually to force proxy re-pick remote
		client.CloseIdleConnections()
		time.Sleep(time.Second)
	}
	// Always pick the same active remote
	assert.Equal(t, 1, len(picked))
	ps := servers[currentPicked]
	if ps == nil {
		t.Fatal("Fail to get current picked server")
	}
	// Shutdown current server to see if we can pick a new one
	ps.Close()
	client := &http.Client{}
	target := "http://" + l.Addr().String()
	assertRespData(t, client, responseData, target)

	// Remove current picked from remotes and test out picking
	p.remotes.Delete(strconv.Itoa(currentPicked))
	ps = servers[currentPicked]
	if ps == nil {
		t.Fatal("Fail to get current picked server")
	}
	ps.Close()
	// First conn will be dropped as the current picked remote is deleted
	_, err = client.Get(target)
	assert.NotNil(t, err)
	// Then pick a new remote
	assertRespData(t, client, responseData, target)
}

func assertRespData(t *testing.T, client *http.Client, expect string, target string) {
	res, err := client.Get(target)
	if err != nil {
		t.Fatal(err)
	}
	data, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}
	assert.Equal(t, expect, string(data))
}
