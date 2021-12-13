package pdtopo_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/client/pdclient/fixture"
	"github.com/pingcap/tidb-dashboard/util/topo"
	"github.com/pingcap/tidb-dashboard/util/topo/pdtopo"
)

func TestGetStoreInstances(t *testing.T) {
	apiClient := fixture.NewAPIAPIClientFixture()
	tiKvStores, tiFlashStores, err := pdtopo.GetStoreInstances(nil, apiClient)
	require.Nil(t, err)
	require.Equal(t, []topo.StoreInfo{
		topo.StoreInfo{
			GitHash:        "d7dc4fff51ca71c76a928a0780a069efaaeaae70",
			Version:        "v4.0.14",
			IP:             "172.16.5.141",
			Port:           20160,
			DeployPath:     "/home/tidb/tidb-deploy/tikv-20160/bin",
			Status:         topo.ComponentStatusUp,
			StatusPort:     20180,
			Labels:         map[string]string{},
			StartTimestamp: 1636421301,
		},
		topo.StoreInfo{
			GitHash:        "d7dc4fff51ca71c76a928a0780a069efaaeaae70",
			Version:        "v4.0.14",
			IP:             "172.16.5.218",
			Port:           20160,
			DeployPath:     "/home/tidb/tidb-deploy/tikv-20160/bin",
			Status:         topo.ComponentStatusUp,
			StatusPort:     20180,
			Labels:         map[string]string{},
			StartTimestamp: 1636421304,
		},
		topo.StoreInfo{
			GitHash:        "d7dc4fff51ca71c76a928a0780a069efaaeaae70",
			Version:        "v4.0.14",
			IP:             "172.16.6.168",
			Port:           20160,
			DeployPath:     "/home/tidb/tidb-deploy/tikv-20160/bin",
			Status:         topo.ComponentStatusUp,
			StatusPort:     20180,
			Labels:         map[string]string{},
			StartTimestamp: 1636421304,
		},
	}, tiKvStores)
	require.Equal(t, []topo.StoreInfo{}, tiFlashStores)
}