import React, { useEffect, useState, useRef } from 'react'
import _ from 'lodash'
import { AssignInternalProperties } from './utlis'
import styles from './index.module.less'
import {
  TreeDiagramProps,
  RawNodeDatum,
  TreeNodeDatum,
  Translate,
  nodeMarginType,
  rectBound,
} from './types'

import NodeWrapper from './NodeWrapper'
import LinkWrapper from './LinkWrapper'
import Minimap from './Minimap'

// import d3 APIs
import { flextree } from 'd3-flextree'
import { hierarchy, HierarchyPointNode, HierarchyPointLink } from 'd3-hierarchy'
import { zoom as d3Zoom, zoomIdentity, zoomTransform } from 'd3-zoom'
import { select, event } from 'd3-selection'

const TreeDiagram = ({
  data,
  nodeSize,
  nodeMargin,
  // viewPort,
  showMinimap,
  minimapScale,
  translate,
  customNodeElement,
  customLinkElement,
}: TreeDiagramProps) => {
  const [treeNodeDatum, setTreeNodeDatum] = useState<TreeNodeDatum[]>([])
  const [nodes, setNodes] = useState<HierarchyPointNode<TreeNodeDatum>[]>([])
  const [links, setLinks] = useState<HierarchyPointLink<TreeNodeDatum>[]>([])
  const [chartTranslate, setChartTranslate] = useState(translate)
  const [initDraw, setInitDraw] = useState(true)
  const [viewPort, setViewPort] = useState<rectBound>({ width: 0, height: 0 })
  const [mainChartGroupBound, setMainChartGroupBound] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  })
  const [minimapTranslate, setMinimapTranslate] = useState({
    x: 0,
    y: 0,
    k: 1,
  })
  const mainChartSVG = select('.mainChartSVG')
  const mainChartGroup = select('.mainChartGroup')

  const treeDiagramContainerRef = useRef<HTMLDivElement>(null)

  // Generates nodes and links
  const generateNodesAndLinks = (
    treeNodeDatum: TreeNodeDatum[],
    nodeMargin: nodeMarginType
  ) => {
    const tree = flextree({
      nodeSize: (node) => {
        const _nodeSize = node.data.__node_attrs.nodeFlexSize

        return [
          _nodeSize.width + nodeMargin.siblingMargin,
          _nodeSize.height + nodeMargin.childrenMargin,
        ]
      },
    })

    const rootNode = tree(
      // @ts-ignore
      hierarchy(treeNodeDatum[0], (d) =>
        d.__node_attrs.collapsed ? null : d.children
      )
    )

    const nodes = rootNode.descendants()
    const links = rootNode.links()

    return { nodes, links }
  }

  // Binds MainChart container
  const bindZoomListener = () => {
    // Sets initial offset, so that first pan and zoom does not jump back to default [0,0] coords.
    // @ts-ignore
    mainChartSVG.call(
      d3Zoom().transform as any,
      zoomIdentity
        .translate(chartTranslate.x, chartTranslate.y)
        .scale(chartTranslate.k)
    )

    mainChartSVG.call(
      d3Zoom()
        .scaleExtent([0.2, 2])
        .on('zoom', () => {
          setChartTranslate(event.transform)
        }) as any
    )
  }

  const findNodesById = (
    nodeId: string,
    nodeSet: TreeNodeDatum[],
    hits: TreeNodeDatum[]
  ) => {
    if (hits.length > 0) {
      return hits
    }
    hits = hits.concat(
      nodeSet.filter((node) => node.__node_attrs.id === nodeId)
    )

    nodeSet.forEach((node) => {
      if (node.children && node.children.length > 0) {
        hits = findNodesById(nodeId, node.children, hits)
      }
    })
    return hits
  }

  const expandSpecificNode = (nodeDatum: TreeNodeDatum) => {
    nodeDatum.__node_attrs.collapsed = false
  }

  const collapseAllDescententNodes = (nodeDatum: TreeNodeDatum) => {
    nodeDatum.__node_attrs.collapsed = true
    if (nodeDatum.children && nodeDatum.children.length > 0) {
      nodeDatum.children.forEach((child) => {
        collapseAllDescententNodes(child)
      })
    }
  }

  function handleNodeExpandBtnToggle(nodeId: string) {
    const data = _.clone(treeNodeDatum)

    // @ts-ignore
    const matches = findNodesById(nodeId, data, [])
    const targetNodeDatum = matches[0]

    if (targetNodeDatum.__node_attrs.collapsed) {
      expandSpecificNode(targetNodeDatum)
    } else {
      collapseAllDescententNodes(targetNodeDatum)
    }

    setTreeNodeDatum(data)
  }

  const getInitTreeDiagramBound = () => {
    const mainChartGroupNode = mainChartGroup.node() as SVGGraphicsElement
    const { x, y, width, height } = mainChartGroupNode.getBBox()
    setMainChartGroupBound({ x: x, y: y, width: width, height: height })

    const minimapTranslate = {
      x: -x,
      y: y,
      k: 1,
    }

    setMinimapTranslate(minimapTranslate)
  }

  useEffect(() => {
    const treeNodes = AssignInternalProperties(data, nodeSize!)
    setTreeNodeDatum(treeNodes)
  }, [data, nodeSize])

  useEffect(() => {
    if (treeNodeDatum.length > 0) {
      const { nodes, links } = generateNodesAndLinks(treeNodeDatum, nodeMargin!)
      setNodes(nodes)
      setLinks(links)
    }
  }, [nodeMargin, treeNodeDatum])

  useEffect(() => {
    if (links.length > 0 && nodes.length > 0 && initDraw) {
      bindZoomListener()
      setChartTranslate(translate)
      getInitTreeDiagramBound()
      setInitDraw(false)
    }
  }, [links, nodes])

  useEffect(() => {
    if (treeDiagramContainerRef.current) {
      const w = treeDiagramContainerRef.current?.clientWidth

      setViewPort({
        width: w,
        height: window.innerHeight - 200,
      })
    }
  }, [])

  return (
    <div className={styles.treeDiagramContainer} ref={treeDiagramContainerRef}>
      <svg
        className="mainChartSVG"
        width={viewPort!.width}
        height={viewPort!.height}
      >
        <g
          className="mainChartGroup"
          transform={`translate(${chartTranslate.x}, ${chartTranslate.y}) scale(${chartTranslate.k})`}
        >
          <g className="linksWrapper">
            {links &&
              links.map((link, i) => {
                return (
                  <LinkWrapper
                    key={i}
                    data={link}
                    collapsiableButtonSize={{ width: 60, height: 30 }}
                    renderCustomLinkElement={customLinkElement}
                  />
                )
              })}
          </g>

          <g className="nodesWrapper">
            {nodes &&
              nodes.map((hierarchyPointNode, i) => {
                const { data, x, y } = hierarchyPointNode
                return (
                  <NodeWrapper
                    data={data}
                    key={data.name}
                    renderCustomNodeElement={customNodeElement}
                    hierarchyPointNode={hierarchyPointNode}
                    zoomScale={translate.k}
                    onNodeExpandBtnToggle={handleNodeExpandBtnToggle}
                  />
                )
              })}
          </g>
        </g>
      </svg>
      {showMinimap && (
        <Minimap
          mainChartGroupBound={mainChartGroupBound}
          viewPort={viewPort}
          links={links}
          nodes={nodes}
          minimapTranslate={minimapTranslate}
          customLinkElement={customLinkElement}
          customNodeElement={customNodeElement}
          minimapScale={minimapScale!}
        />
      )}
    </div>
  )
}

TreeDiagram.defaultProps = {
  nodeSize: { width: 250, height: 150 },
  showMinimap: false,
  minimapScale: 0.15,
  nodeMargin: {
    siblingMargin: 40,
    childrenMargin: 60,
  },
  // viewPort: {
  //   width: window.innerWidth,
  //   height: window.innerHeight - 200,
  // },
}

export default TreeDiagram
