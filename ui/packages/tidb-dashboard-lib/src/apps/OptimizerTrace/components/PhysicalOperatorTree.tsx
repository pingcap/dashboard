import React, { useEffect, useRef, useState } from 'react'
import { graphviz } from 'd3-graphviz'

import styles from './OperatorTree.module.less'
import { LogicalOperatorNode, createLabels } from './LogicalOperatorTree'

export interface PhysicalOperatorNode extends LogicalOperatorNode {
  parentNode: null | PhysicalOperatorNode
  childrenNodes: PhysicalOperatorNode[]
  mapping: string
}

interface PhysicalOperatorTreeProps {
  data: PhysicalOperatorNode
  className?: string
}

function convertTreeToArry(
  node: PhysicalOperatorNode,
  arr: PhysicalOperatorNode[]
) {
  arr.push(node)
  if (node.childrenNodes) {
    node.childrenNodes.forEach((n) => convertTreeToArry(n, arr))
  }
}

export default function PhysicalOperatorTree({
  data,
  className
}: PhysicalOperatorTreeProps) {
  const [curNodeName, setCurNodeName] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const containerEl = containerRef.current
    if (!containerEl) {
      return
    }

    console.log('physcial data:', data)

    // const allDatas = [data, ...(data.childrenNodes || [])]
    let allDatas: PhysicalOperatorNode[] = []
    convertTreeToArry(data, allDatas)
    const define = allDatas
      .map(
        (n) =>
          `${n.id} ${createLabels({
            label: `${n.type}_${n.id}\ncost: ${n.cost.toFixed(4)}`,
            color: n.selected ? '#4169E1' : '',
            fillcolor:
              `${n.type}_${n.id}` === curNodeName ? '#87CEFA' : 'white',
            // fillcolor: 'red',
            tooltip: `info: ${n.info}`
          })};\n`
      )
      .join('')
    console.log('define:', define)
    const link = allDatas
      .map((n) =>
        (n.children || [])
          .map(
            (c) =>
              `${n.id} -> ${c} ${createLabels({
                color: n.selected ? '#4169E1' : ''
              })};\n`
          )
          .join('')
      )
      .join('')
    console.log('link:', link)

    graphviz(containerEl).renderDot(
      `digraph {
  node [shape=ellipse fontsize=8 fontname="Verdana" style="filled"];
  ${define}\n${link}\n}`
    )
  }, [containerRef, data, curNodeName])

  function handleClick(e) {
    // console.log(e.target)
    // console.log(e.target.parentNode)
    const trigger = e.target
    const parent = e.target.parentNode
    if (
      (trigger?.tagName === 'text' || trigger?.tagName === 'ellipse') &&
      parent?.tagName === 'a'
    ) {
      // console.log('selected a physical node')
      // console.log(parent.children)
      for (const el of parent.children) {
        if (el.tagName === 'text') {
          console.log(el.innerHTML)
          setCurNodeName(el.innerHTML)
          break
        }
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.operator_tree} ${className || ''}`}
      onClick={handleClick}
    ></div>
  )
}
