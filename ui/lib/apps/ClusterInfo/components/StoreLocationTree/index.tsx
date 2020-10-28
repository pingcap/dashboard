import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { Space, Tooltip } from 'antd'

export interface IStoreLocationProps {
  dataSource: any
}

const margin = { left: 60, right: 40, top: 60, bottom: 100 }
const dx = 40

const diagonal = d3
  .linkHorizontal()
  .x((d: any) => d.y)
  .y((d: any) => d.x)

function calcHeight(root) {
  let x0 = Infinity
  let x1 = -x0
  root.each((d) => {
    if (d.x > x1) x1 = d.x
    if (d.x < x0) x0 = d.x
  })
  return x1 - x0
}

export default function StoreLocationTree({ dataSource }: IStoreLocationProps) {
  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let divWidth = divRef.current?.clientWidth || 0
    const root = d3.hierarchy(dataSource) as any
    root.descendants().forEach((d, i) => {
      d.id = i
      d._children = d.children
      // collapse all nodes default
      // if (d.depth) d.children = null
    })
    const dy = divWidth / (root.height + 2)
    let tree = d3.tree().nodeSize([dx, dy])

    const div = d3.select(divRef.current)
    div.select('svg#slt').remove()
    const svg = div
      .append('svg')
      .attr('id', 'slt')
      .attr('width', divWidth)
      .attr('height', dx + margin.top + margin.bottom)
      .style('font', '14px sans-serif')
      .style('user-select', 'none')

    const bound = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)
    const gLink = bound
      .append('g')
      .attr('fill', 'none')
      .attr('stroke', '#555')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 2)
    const gNode = bound
      .append('g')
      .attr('cursor', 'pointer')
      .attr('pointer-events', 'all')

    // zoom
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 5])
      .filter(function () {
        // ref: https://godbasin.github.io/2018/02/07/d3-tree-notes-4-zoom-amd-drag/
        // only zoom when pressing CTRL
        const isWheelEvent = d3.event instanceof WheelEvent
        return !isWheelEvent || (isWheelEvent && d3.event.ctrlKey)
      })
      .on('zoom', () => {
        const t = d3.event.transform
        bound.attr(
          'transform',
          `translate(${t.x + margin.left}, ${t.y + margin.top}) scale(${t.k})`
        )

        // this will cause unexpected result when dragging
        // svg.attr('transform', d3.event.transform)
      })
    svg.call(zoom as any)

    // zoom actions
    d3.select('#slt-zoom-in').on('click', function () {
      zoom.scaleBy(svg.transition().duration(500) as any, 1.2)
    })
    d3.select('#slt-zoom-out').on('click', function () {
      zoom.scaleBy(svg.transition().duration(500) as any, 0.8)
    })
    d3.select('#slt-zoom-reset').on('click', function () {
      // https://stackoverflow.com/a/51981636/2998877
      svg
        .transition()
        .duration(500)
        .call(zoom.transform as any, d3.zoomIdentity)
    })

    update(root)

    function update(source) {
      // use altKey to slow down the animation, interesting!
      const duration = d3.event && d3.event.altKey ? 2500 : 500
      const nodes = root.descendants().reverse()
      const links = root.links()

      // compute the new tree layout
      // it modifies root self
      tree(root)
      const boundHeight = calcHeight(root)
      // node.x represent the y axes position actually
      // [root.y, root.x] is [0, 0], we need to move it to [0, boundHeight/2]
      root.descendants().forEach((d, i) => {
        d.x += boundHeight / 2
      })
      if (root.x0 === undefined) {
        // initial root.x0, root.y0, only need to set it once
        root.x0 = root.x
        root.y0 = root.y
      }

      const transition = svg
        .transition()
        .duration(duration)
        .attr('width', divWidth)
        .attr('height', boundHeight + margin.top + margin.bottom)

      // update the nodes
      const node = gNode.selectAll('g').data(nodes, (d: any) => d.id)

      // enter any new nodes at the parent's previous position
      const nodeEnter = node
        .enter()
        .append('g')
        .attr('transform', (_d) => `translate(${source.y0},${source.x0})`)
        .attr('fill-opacity', 0)
        .attr('stroke-opacity', 0)
        .on('click', (d: any) => {
          d.children = d.children ? null : d._children
          update(d)
        })

      nodeEnter
        .append('circle')
        .attr('r', 6)
        .attr('fill', (d: any) => (d._children ? '#ff4d4f' : '#3351ff'))
        .attr('stroke-width', 10)

      nodeEnter
        .append('text')
        .attr('dy', '0.31em')
        .attr('x', (d: any) => (d._children ? -8 : 8))
        .attr('text-anchor', (d: any) => (d._children ? 'end' : 'start'))
        .text(({ data: { name, value } }: any) => {
          if (value) {
            return `${name}: ${value}`
          }
          return name
        })
        .clone(true)
        .lower()
        .attr('stroke-linejoin', 'round')
        .attr('stroke-width', 3)
        .attr('stroke', 'white')

      // transition nodes to their new position
      node
        .merge(nodeEnter as any)
        .transition(transition as any)
        .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
        .attr('fill-opacity', 1)
        .attr('stroke-opacity', 1)

      // transition exiting nodes to the parent's new position
      node
        .exit()
        .transition(transition as any)
        .remove()
        .attr('transform', (d) => `translate(${source.y},${source.x})`)
        .attr('fill-opacity', 0)
        .attr('stroke-opacity', 0)

      // update the links
      const link = gLink.selectAll('path').data(links, (d: any) => d.target.id)

      // enter any new links at the parent's previous position
      const linkEnter = link
        .enter()
        .append('path')
        .attr('d', (_d) => {
          const o = { x: source.x0, y: source.y0 }
          return diagonal({ source: o, target: o } as any)
        })

      // transition links to their new position
      link
        .merge(linkEnter as any)
        .transition(transition as any)
        .attr('d', diagonal as any)

      // transition exiting nodes to the parent's new position
      link
        .exit()
        .transition(transition as any)
        .remove()
        .attr('d', (_d) => {
          const o = { x: source.x, y: source.y }
          return diagonal({ source: o, target: o } as any)
        })

      // stash the old positions for transition
      root.eachBefore((d) => {
        d.x0 = d.x
        d.y0 = d.y
      })
    }

    function resizeHandler() {
      divWidth = divRef.current?.clientWidth || 0
      const dy = divWidth / (root.height + 2)
      tree = d3.tree().nodeSize([dx, dy])
      update(root)
    }

    window.addEventListener('resize', resizeHandler)
    return () => {
      window.removeEventListener('resize', resizeHandler)
    }
  }, [dataSource])

  return (
    <div ref={divRef} style={{ position: 'relative' }}>
      <Space
        style={{
          cursor: 'pointer',
          fontSize: 18,
          position: 'absolute',
        }}
      >
        <ZoomInOutlined id="slt-zoom-in" />
        <ZoomOutOutlined id="slt-zoom-out" />
        <ReloadOutlined id="slt-zoom-reset" />
        <Tooltip title="You can also zoom in or out by pressing CTRL and scrolling mouse">
          <QuestionCircleOutlined />
        </Tooltip>
      </Space>
    </div>
  )
}

// refs:
// https://observablehq.com/@d3/tidy-tree
// https://observablehq.com/@d3/collapsible-tree
