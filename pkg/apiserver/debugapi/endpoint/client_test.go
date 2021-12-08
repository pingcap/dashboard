// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package endpoint

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	. "github.com/pingcap/check"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
)

func TestClient(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testClientSuite{})

type testClientSuite struct{}

type testFetcher struct{}

func (d *testFetcher) Fetch(req *ResolvedRequestPayload) (*httpc.Response, error) {
	r := httptest.NewRecorder()
	_, _ = r.WriteString(testCombineReq(req.Host, req.Port, req.Path(), req.Query()))
	return &httpc.Response{Response: r.Result()}, nil
}

func testCombineReq(host string, port int, path, query string) string {
	return fmt.Sprintf("%s:%d%s?%s", host, port, path, query)
}

var (
	testParamModel = &BaseAPIParamModel{Type: "text"}
	testAPI        = &APIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test/{pathParam}",
		Method:    http.MethodGet,
		PathParams: []*APIParam{
			{Model: testParamModel, Name: "pathParam", Required: true},
		},
		QueryParams: []*APIParam{
			{Model: testParamModel, Name: "queryParam", Required: true},
			{Model: testParamModel, Name: "queryParam2"},
		},
	}
)

func (t *testClientSuite) Test_Send(c *C) {
	client := NewClient(&testFetcher{}, []*APIModel{testAPI})
	req, err := client.Send(&RequestPayload{
		testAPI.ID,
		"127.0.0.1",
		10080,
		map[string]string{
			"pathParam":  "foo",
			"queryParam": "bar",
		},
	})
	if err != nil {
		c.Error(err)
	}
	data, _ := req.Body()

	c.Assert(string(data), Equals, testCombineReq("127.0.0.1", 10080, "/test/foo", "queryParam=bar"))
}

func (t *testClientSuite) Test_GetAllAPIModels(c *C) {
	client := NewClient(&testFetcher{}, []*APIModel{testAPI})
	c.Assert(client.GetAllAPIModels()[0].ID, Equals, testAPI.ID)
}

func (t *testClientSuite) Test_resolve(c *C) {
	client := NewClient(&testFetcher{}, []*APIModel{testAPI})
	req, err := client.resolve(&RequestPayload{
		testAPI.ID,
		"127.0.0.1",
		10080,
		map[string]string{
			"pathParam":  "foo",
			"queryParam": "bar",
		},
	})
	if err != nil {
		c.Error(err)
	}

	c.Assert(req.Path(), Equals, "/test/foo")
	c.Assert(req.Query(), Equals, "queryParam=bar")
}
