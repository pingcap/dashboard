// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"context"
	"fmt"
)

// CompInfo provides common information for a component.
// It must not be persisted, as the runtime status may change at any time.
// It must not be accepted directly from the user input. See SignedCompDesc.
// The contained descriptor is unsigned, which means it may not be very useful to be passed to users.
// Call WithSignature() if you want to pass to users.
type CompInfo struct {
	Descriptor CompDesc
	Version    string
	Status     CompStatus
}

func (i *CompInfo) WithSignature(signer CompDescSigner) (CompInfoWithSignedDesc, error) {
	sd, err := signer.Sign(&i.Descriptor)
	if err != nil {
		return CompInfoWithSignedDesc{}, err
	}
	return CompInfoWithSignedDesc{
		SignedDescriptor: sd,
		Version:          i.Version,
		Status:           i.Status,
	}, nil
}

func BatchSignCompInfo(signer CompDescSigner, list []CompInfo) ([]CompInfoWithSignedDesc, error) {
	signedList := make([]CompInfoWithSignedDesc, 0, len(list))
	for _, info := range list {
		signed, err := info.WithSignature(signer)
		if err != nil {
			return nil, err
		}
		signedList = append(signedList, signed)
	}
	return signedList, nil
}

// CompInfoWithSignedDesc is a CompInfo where the descriptor is attached with a signature.
// This struct can be passed to users so that users can securely pass signed descriptor back.
type CompInfoWithSignedDesc struct {
	SignedDescriptor SignedCompDesc
	Version          string
	Status           CompStatus
}

// Info is an interface implemented by all component info structures.
type Info interface {
	Info() CompInfo
}

func GetInfoByKind(ctx context.Context, p TopologyProvider, kind Kind) ([]CompInfo, error) {
	switch kind {
	case KindTiDB:
		v, err := p.GetTiDB(ctx)
		if err != nil {
			return nil, err
		}
		result := make([]CompInfo, 0, len(v))
		for _, info := range v {
			result = append(result, info.Info())
		}
		return result, nil
	case KindTiKV:
		v, err := p.GetTiKV(ctx)
		if err != nil {
			return nil, err
		}
		result := make([]CompInfo, 0, len(v))
		for _, info := range v {
			result = append(result, info.Info())
		}
		return result, nil
	case KindPD:
		v, err := p.GetPD(ctx)
		if err != nil {
			return nil, err
		}
		result := make([]CompInfo, 0, len(v))
		for _, info := range v {
			result = append(result, info.Info())
		}
		return result, nil
	case KindTiFlash:
		v, err := p.GetTiFlash(ctx)
		if err != nil {
			return nil, err
		}
		result := make([]CompInfo, 0, len(v))
		for _, info := range v {
			result = append(result, info.Info())
		}
		return result, nil
	case KindAlertManager:
		v, err := p.GetAlertManager(ctx)
		if err != nil {
			return nil, err
		}
		return []CompInfo{v.Info()}, nil
	case KindGrafana:
		v, err := p.GetGrafana(ctx)
		if err != nil {
			return nil, err
		}
		return []CompInfo{v.Info()}, nil
	case KindPrometheus:
		v, err := p.GetPrometheus(ctx)
		if err != nil {
			return nil, err
		}
		return []CompInfo{v.Info()}, nil
	default:
		return nil, fmt.Errorf("unsupported component %s", kind)
	}
}
