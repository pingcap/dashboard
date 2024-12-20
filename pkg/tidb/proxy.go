// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package tidb

import (
	"context"
	"io"
	"net"
	"sync"
	"time"

	"github.com/pingcap/log"
	"go.uber.org/atomic"
	"go.uber.org/zap"
)

type remote struct {
	addr     string
	inactive *atomic.Bool
}

func (r *remote) isActive() bool {
	return !r.inactive.Load()
}

func (r *remote) becomeInactive() {
	r.inactive.Store(true)
	log.Debug("remote become inactive", zap.String("remote", r.addr))
}

func (r *remote) checkAlive(timeout time.Duration) error {
	conn, err := net.DialTimeout("tcp", r.addr, timeout)
	if err != nil {
		return err
	}
	_ = conn.Close()
	r.inactive.Store(false)
	return nil
}

type proxy struct {
	listener      net.Listener
	checkInterval time.Duration
	dialTimeout   time.Duration

	noAliveRemote *atomic.Bool
	remotes       sync.Map
	current       *atomic.String
}

func newProxy(l net.Listener, endpoints map[string]string, checkInterval time.Duration, timeout time.Duration) *proxy {
	if checkInterval <= 0 {
		checkInterval = 2 * time.Second
	}
	if timeout <= 0 {
		timeout = 3 * time.Second
	}
	p := &proxy{
		listener:      l,
		remotes:       sync.Map{},
		dialTimeout:   timeout,
		checkInterval: checkInterval,
		noAliveRemote: atomic.NewBool(len(endpoints) == 0),
		current:       atomic.NewString(""),
	}
	for key, e := range endpoints {
		p.remotes.Store(key, &remote{addr: e, inactive: atomic.NewBool(true)})
	}
	return p
}

func (p *proxy) port() int {
	return p.listener.Addr().(*net.TCPAddr).Port
}

func (p *proxy) updateRemotes(remotes map[string]struct{}) {
	if len(remotes) == 0 {
		p.remotes.Range(func(key, _ interface{}) bool {
			p.remotes.Delete(key)
			return true
		})
		p.noAliveRemote.Store(true)
		return
	}
	// update or create new remote
	for addr := range remotes {
		if _, ok := p.remotes.Load(addr); !ok {
			log.Debug("proxy adds new remote", zap.String("remote", addr))
			p.remotes.Store(addr, &remote{
				addr:     addr,
				inactive: atomic.NewBool(true),
			})
		}
	}
	// remove old remote
	p.remotes.Range(func(key, _ interface{}) bool {
		addr := key.(string)
		if _, ok := remotes[addr]; !ok {
			log.Debug("proxy discards remote", zap.String("remote", addr))
			p.remotes.Delete(key)
		}
		return true
	})
	p.noAliveRemote.Store(false)
}

func (p *proxy) serve(in net.Conn) {
	out := p.pickActiveConn()
	if out == nil {
		log.Warn("no alive remote, drop incoming conn")
		_ = in.Close()
		return
	}
	// bidirectional copy
	go func() {
		// nolint
		io.Copy(in, out)
		_ = in.Close()
		_ = out.Close()
	}()
	// nolint
	io.Copy(out, in)
	_ = out.Close()
	_ = in.Close()
}

func (p *proxy) pickActiveConn() (out net.Conn) {
	var (
		err    error
		picked *remote
	)
	for {
		picked = p.pick()
		if picked == nil {
			break
		}
		out, err = net.DialTimeout("tcp", picked.addr, p.dialTimeout)
		if err == nil {
			break
		}
		p.current.Store("")
		picked.becomeInactive()
		log.Warn("remote become inactive", zap.String("remote", picked.addr))
	}
	p.noAliveRemote.Store(out == nil)
	return
}

// pick returns an active remote if there is any.
func (p *proxy) pick() *remote {
	var picked *remote
	if p.current.Load() == "" {
		p.remotes.Range(func(key, value interface{}) bool {
			id := key.(string)
			r := value.(*remote)
			if r.isActive() {
				p.current.Store(id)
				picked = r
				return false
			}
			return true
		})
	}
	if picked != nil {
		return picked
	}
	curRemote := p.current.Load()
	if curRemote != "" {
		r, ok := p.remotes.Load(curRemote)
		if ok {
			picked = r.(*remote)
		} else {
			p.current.Store("")
		}
	}
	return picked
}

func (p *proxy) doCheck(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(p.checkInterval):
			p.remotes.Range(func(_, value interface{}) bool {
				rmt := value.(*remote)
				if rmt.isActive() {
					return true
				}
				go func(r *remote) {
					log.Debug("run remote check", zap.String("remote", r.addr))
					if err := r.checkAlive(p.dialTimeout); err != nil {
						log.Warn("fail to recv activity from remote, stay inactive and wait to next checking round", zap.String("remote", r.addr), zap.Duration("interval", p.checkInterval), zap.Error(err))
					} else {
						log.Debug("remote become active", zap.String("remote", r.addr))
					}
				}(rmt)
				return true
			})
		}
	}
}

func (p *proxy) run(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	endpoints := make([]string, 0)
	p.remotes.Range(func(_, value interface{}) bool {
		r := value.(*remote)
		endpoints = append(endpoints, r.addr)
		return true
	})
	log.Info("start serve requests to remotes", zap.String("endpoint", p.listener.Addr().String()), zap.Strings("remotes", endpoints))
	go p.doCheck(ctx)

	defer p.listener.Close()
	// wait a check round before serve connections
	select {
	case <-ctx.Done():
		return
	case <-time.After(p.checkInterval + time.Second):
	}
	// serve
	for {
		type accepted struct {
			conn net.Conn
			err  error
		}
		accept := make(chan accepted, 1)
		go func() {
			conn, err := p.listener.Accept()
			accept <- accepted{conn, err}
		}()

		select {
		case <-ctx.Done():
			return
		case a := <-accept:
			if a.err != nil {
				log.Warn("got err from listener", zap.Error(a.err), zap.String("from", p.listener.Addr().String()))
			} else {
				go p.serve(a.conn)
			}
		}
	}
}
