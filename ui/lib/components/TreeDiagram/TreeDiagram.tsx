import React, { useEffect, useState, useRef } from 'react'
import _ from 'lodash'
import { AssignInternalProperties } from './utlis'
import styles from './index.module.less'
import { TreeDiagramProps, TreeNodeDatum } from './types'

import Minimap from './Minimap'
import MainChart from './MainChart'
import NodeWrapperDetail from './NodeDetailWrapper'

import { Drawer } from 'antd'

// imports d3 APIs
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom'
import { brush as d3Brush } from 'd3-brush'
import { select, event } from 'd3-selection'
import { scaleLinear } from 'd3-scale'
import { rectBound } from '../TreeDiagramView/types'

interface TreeBoundType {
  [k: string]: {
    x: number
    y: number
    width: number
    height: number
  }
}

const TreeDiagram = ({
  data,
  nodeSize,
  nodeMargin,
  showMinimap,
  minimapScale,
  viewport,
  customNodeElement,
  customLinkElement,
  customNodeDetailElement,
  gapBetweenTrees,
}: TreeDiagramProps) => {
  const [treeNodeDatum, setTreeNodeDatum] = useState<TreeNodeDatum[]>([])
  const [showNodeDetail, setShowNodeDetail] = useState(false)
  const [selectedNodeDetail, setSelectedNodeDetail] = useState<TreeNodeDatum>()
  const [zoomToFitViewportScale, setZoomToFitViewportScale] = useState(0)
  const [multiTreesViewport, setMultiTreesViewport] =
    useState<rectBound>(viewport)
  const singleTreeBoundsMap: TreeBoundType = {}
  const [adjustPosition, setAdjustPosition] = useState({ width: 0, height: 0 })

  // Inits tree translate, the default position is on the top-middle of canvas
  const [multiTreesTranslate, setMultiTreesTranslate] = useState({
    x: 0,
    y: 0,
    k: 1,
  })

  // Sets the bound of entire tree
  const [multiTreesBound, setMultiTreesBound] = useState({
    width: 0,
    height: 0,
  })

  const treeDiagramContainerRef = useRef<HTMLDivElement>(null)

  // A SVG container for main chart
  const multiTreesSVGSelection = select('.multiTreesSVG')

  const brushRef = useRef<SVGGElement>(null)
  const brushSelection = select(brushRef.current!)

  /**
   *
   * @param zoomScale
   * @returns a continuous linear scale function to calculate the corresponding width in mainChart or minimap
   *
   * minimapScaleX(zoomScale)(widthOnMinimap) will return corresponding widthOnMainChart
   * minimapScaleX(zoomScale).invert(widthOnMainChart) will return corresponding widthOnMinimap
   */
  const minimapScaleX = (zoomScale) => {
    return scaleLinear()
      .domain([0, multiTreesBound.width])
      .range([0, multiTreesBound.width * zoomScale])
  }

  // Creates a continuous linear scale to calculate the corresponse height in mainChart or minimap
  const minimapScaleY = (zoomScale) => {
    return scaleLinear()
      .domain([0, multiTreesBound.height])
      .range([0, multiTreesBound.height * zoomScale])
  }

  const handleUpdateTreeTranslate = (zoomScale, brushX, brushY) => {
    setMultiTreesTranslate({
      x: minimapScaleX(zoomScale.k)(-brushX),
      y: minimapScaleY(zoomScale.k)(-brushY),
      k: zoomScale.k,
    })
  }

  // Limits brush move extent
  const brushBehavior = d3Brush().extent([
    [
      minimapScaleX(multiTreesTranslate.k)(-viewport.width / 2),
      minimapScaleY(multiTreesTranslate.k)(-viewport.height / 2),
    ],
    [
      minimapScaleX(multiTreesTranslate.k)(
        multiTreesBound.width + viewport.width / 2
      ),
      minimapScaleY(multiTreesTranslate.k)(
        multiTreesBound.height + viewport.height / 2
      ),
    ],
  ])

  const onZoom = () => {
    const t = event.transform

    setMultiTreesTranslate(t)

    // Moves brush on minimap when zoom behavior is triggered.
    brushBehavior.move(brushSelection, [
      [minimapScaleX(t.k).invert(-t.x), minimapScaleY(t.k).invert(-t.y)],
      [
        minimapScaleX(t.k).invert(-t.x + viewport.width),
        minimapScaleY(t.k).invert(-t.y + viewport.height),
      ],
    ])
  }

  const zoomBehavior = d3Zoom()
    .scaleExtent([0.5, 5])
    // Limits the zoom translate extent
    // .translateExtent([
    //   [-viewport.width / 2, -viewport.height / 2],
    //   [
    //     multiTreesBound.width + viewport.width / 2,
    //     multiTreesBound.height + viewport.height / 2,
    //   ],
    // ])
    .on('zoom', () => onZoom())

  // Binds MainChart container
  const bindZoomListener = () => {
    multiTreesSVGSelection.call(zoomBehavior as any)

    multiTreesSVGSelection.call(
      d3Zoom().transform as any,
      zoomIdentity
        .translate(multiTreesTranslate.x, multiTreesTranslate.y)
        .scale(multiTreesTranslate.k)
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
    const data = treeNodeDatum.map((datum) => _.clone(datum))

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

  function handleOnNodeDetailClick(node) {
    setShowNodeDetail(true)
    setSelectedNodeDetail(node)
  }

  // Updates multiTrees bound and returns single tree position, which contains root point and offset to original point [0,0].
  const getInitSingleTreeBound = (treeIdx) => {
    let offset = 0
    let multiTreesBound: rectBound = { width: 0, height: 0 }
    const singleTreeGroupNode = select(
      `.singleTreeGroup-${treeIdx}`
    ).node() as SVGGraphicsElement

    const { x, y, width, height } = singleTreeGroupNode.getBBox()

    singleTreeBoundsMap[`singleTreeGroup-${treeIdx}`] = {
      x: x,
      y: y,
      width: width,
      height: height,
    }

    for (let i = treeIdx; i > 0; i--) {
      offset =
        offset +
        singleTreeBoundsMap[`singleTreeGroup-${i - 1}`].width +
        gapBetweenTrees!

      multiTreesBound.width =
        multiTreesBound.width +
        singleTreeBoundsMap[`singleTreeGroup-${i - 1}`].width +
        gapBetweenTrees!

      multiTreesBound.height =
        singleTreeBoundsMap[`singleTreeGroup-${i - 1}`].height >
        multiTreesBound.height
          ? singleTreeBoundsMap[`singleTreeGroup-${i - 1}`].height
          : multiTreesBound.height
    }

    setMultiTreesBound({
      width: multiTreesBound.width + width,
      height: multiTreesBound.height > height ? multiTreesBound.height : height,
    })

    return { x, y, offset }
  }

  const getZoomToFitViewPortScale = () => {
    const widthRatio = multiTreesViewport.width / multiTreesBound.width
    const heightRation = multiTreesViewport.height / multiTreesBound.height
    const k = Math.min(widthRatio, heightRation)

    setZoomToFitViewportScale(k > 1 ? 1 : k)

    if (heightRation > 2 && widthRatio > 2) {
      setAdjustPosition({
        width: multiTreesViewport.width / widthRatio,
        height: viewport.height / heightRation,
      })
    } else if (widthRatio > 2) {
      setAdjustPosition({
        ...adjustPosition,
        width: multiTreesViewport.width / widthRatio,
      })
    } else if (heightRation > 2) {
      setAdjustPosition({
        ...adjustPosition,
        height: viewport.height / heightRation,
      })
    }
  }

  useEffect(() => {
    // Assigns all internal properties to tree node
    const treeNodes = AssignInternalProperties(data, nodeSize!)
    setTreeNodeDatum(treeNodes)
  }, [data, nodeSize])

  useEffect(() => {
    if (treeDiagramContainerRef.current) {
      setMultiTreesViewport({
        width: treeDiagramContainerRef.current?.clientWidth,
        height: treeDiagramContainerRef.current?.clientHeight,
      })
      getZoomToFitViewPortScale()
      bindZoomListener()
    }
  }, [multiTreesBound])

  return (
    <div
      className={`${styles.treeDiagramContainer} tree-diagram-container`}
      ref={treeDiagramContainerRef}
    >
      <MainChart
        treeNodeDatum={treeNodeDatum}
        classNamePrefix="multiTrees"
        translate={multiTreesTranslate}
        viewport={multiTreesViewport}
        customLinkElement={customLinkElement}
        customNodeElement={customNodeElement}
        onNodeExpandBtnToggle={handleNodeExpandBtnToggle}
        onNodeDetailClick={handleOnNodeDetailClick}
        getTreePosition={getInitSingleTreeBound}
        nodeMargin={nodeMargin}
        adjustPosition={adjustPosition}
        zoomToFitViewportScale={zoomToFitViewportScale}
      />
      {showMinimap && (
        <Minimap
          treeNodeDatum={treeNodeDatum}
          classNamePrefix="minimapMultiTrees"
          viewport={viewport}
          customLinkElement={customLinkElement}
          customNodeElement={customNodeElement}
          multiTreesBound={multiTreesBound}
          nodeMargin={nodeMargin}
          minimapScale={minimapScale!}
          minimapScaleX={minimapScaleX}
          minimapScaleY={minimapScaleY}
          multiTreesSVG={multiTreesSVGSelection}
          updateTreeTranslate={handleUpdateTreeTranslate}
          brushBehavior={brushBehavior}
          brushRef={brushRef}
          adjustPosition={adjustPosition}
          zoomToFitViewportScale={zoomToFitViewportScale}
          getTreePosition={getInitSingleTreeBound}
        />
      )}
      {selectedNodeDetail && (
        <Drawer
          title={selectedNodeDetail!.name}
          placement="right"
          width={450}
          closable={false}
          onClose={() => {
            setShowNodeDetail(false)
          }}
          visible={showNodeDetail}
          destroyOnClose={true}
          getContainer={false}
          style={{ position: 'absolute' }}
          key="right"
        >
          <NodeWrapperDetail
            data={selectedNodeDetail}
            renderCustomNodeDetailElement={customNodeDetailElement}
          />
        </Drawer>
      )}
    </div>
  )
}

TreeDiagram.defaultProps = {
  nodeSize: { width: 250, height: 150 },
  showMinimap: false,
  minimapScale: 0.1,
  nodeMargin: {
    siblingMargin: 40,
    childrenMargin: 60,
  },
  gapBetweenTrees: 100,
}

export default TreeDiagram