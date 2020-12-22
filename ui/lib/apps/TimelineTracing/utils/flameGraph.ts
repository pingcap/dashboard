import { TraceQueryTraceResponse, TraceSpan } from '@lib/client'

export interface IFullSpan extends TraceSpan {
  node_type: string
  children: IFullSpan[]

  //
  end_unix_time_ns: number
  max_end_time_ns: number // include children span
  height: number // max chilren layers, leaf node which has no children is 0
  depth: number // which layer it is drawed in, rootSpan is 0
  // used to decide whether need to draw a vertical line to point to parent
  // when depth - parentDepth > 1, need to draw a vertical line
  parentDepth: number
}

type FullSpanMap = Record<string, IFullSpan>

export interface IFlameGraph {
  startTime: number
  maxDepth: number
  rootSpan: IFullSpan
}

export function genFlameGraph(source: TraceQueryTraceResponse): IFlameGraph {
  // step 1: flatten the spans
  const allSpans: IFullSpan[] = []
  source.span_sets?.forEach((spanSet) => {
    spanSet.spans?.forEach((span) => {
      allSpans.push({
        ...span,

        node_type: spanSet.node_type!,
        children: [],

        end_unix_time_ns: 0,
        max_end_time_ns: 0,
        height: 0,
        depth: 0,
        parentDepth: 0,
      })
    })
  })

  // step 2: iterator, to build a tree
  const rootSpan = allSpans.find((span) => span.parent_id === 0)!
  const startTime = rootSpan.begin_unix_time_ns!
  allSpans.forEach((span) => {
    span.begin_unix_time_ns = span.begin_unix_time_ns! - startTime
    span.end_unix_time_ns = span.begin_unix_time_ns + span.duration_ns!
    span.max_end_time_ns = span.end_unix_time_ns
  })
  const spansObj = buildTree(allSpans)
  console.log('rootNode:', rootSpan)

  calcMaxEndTime(spansObj)
  // console.log('rootNode after calcMaxTime', rootSpan)
  calcHeight(rootSpan)
  // console.log('rootNode after calcHeight', rootSpan)
  calcDepth(rootSpan)
  // console.log('rootNode after calcDepth', rootSpan)

  const maxDepth = calcMaxDepth(rootSpan)
  console.log('max depth:', maxDepth)

  // return rootSpan
  return {
    startTime,
    maxDepth,
    rootSpan,
  }
}

function buildTree(allSpans: IFullSpan[]): FullSpanMap {
  let spansObj = allSpans.reduce((accu, cur) => {
    accu[cur.span_id!] = cur
    return accu
  }, {} as FullSpanMap)

  // set children
  Object.values(spansObj).forEach((span) => {
    const parent = spansObj[span.parent_id!]
    // the root span has no parent
    if (parent) {
      parent.children.push(span)
    }
  })

  // sort children
  // notice: we can't sort it by span_id
  Object.values(spansObj).forEach((span) => {
    span.children.sort((a, b) => {
      let delta = a.begin_unix_time_ns! - b.begin_unix_time_ns!
      if (delta === 0) {
        // make the span with longer duration in the front when they have the same begin time
        // so we can draw the span with shorter duration first
        // to make them closer to the parent span
        delta = b.duration_ns! - a.duration_ns!
      }
      return delta
    })
  })
  return spansObj
}

//////////////////

function calcMaxEndTime(spansObj: FullSpanMap) {
  Object.values(spansObj)
    .filter((span) => span.children.length === 0) // find leaf spans
    .forEach((span) => calcSpanMaxEndTime(span, spansObj))
}

function calcSpanMaxEndTime(span: IFullSpan, spansObj: FullSpanMap) {
  // find parent
  const parent = spansObj[span.parent_id!]
  if (parent === undefined) return

  // check whether it is the parent's last child
  // nope!
  // other children may have larger max_end_time_ns
  // const lastSlibing = parent.children[parent.children.length - 1]
  // if (lastSlibing.span_id !== span.span_id) return

  if (span.max_end_time_ns > parent.max_end_time_ns) {
    parent.max_end_time_ns = span.max_end_time_ns
  }
  calcSpanMaxEndTime(parent, spansObj)
}

/////////////////////

function calcHeight(span: IFullSpan) {
  // return condition
  if (span.children.length === 0) {
    span.height = 0 // leaf node
    return 0
  }

  const childrenHeight = span.children.map((childSpan) => calcHeight(childSpan))
  const maxHeight = Math.max(...childrenHeight) + 1
  span.height = maxHeight
  return maxHeight
}

// keep the same logic as datadog
// compare the spans from right to left
// span.max_end_time_ns > lastSpan.begin_unix_time_ns => span.depth = parentSpan.depth + 1
// else => span.depth = lastSpan.depth + lastSpan.height + 2
function calcDepth(parentSpan: IFullSpan) {
  const childrenMaxIdx = parentSpan.children.length - 1
  for (let i = childrenMaxIdx; i >= 0; i--) {
    const curSpan = parentSpan.children[i]
    curSpan.parentDepth = parentSpan.depth
    if (i === childrenMaxIdx) {
      curSpan.depth = parentSpan.depth + 1
    } else {
      const lastSpan = parentSpan.children[i + 1]
      if (
        curSpan.max_end_time_ns > lastSpan.begin_unix_time_ns! ||
        curSpan.begin_unix_time_ns! === lastSpan.begin_unix_time_ns!
      ) {
        if (lastSpan.height === 0) {
          curSpan.depth = lastSpan.depth + 1
        } else {
          curSpan.depth = lastSpan.depth + lastSpan.height + 2
        }
        // curSpan.depth = lastSpan.depth + lastSpan.height + 1
        // // keep same as the datadog
        // if (lastSpan.height >= 1) {
        //   curSpan.depth += 1
        // }
      } else {
        curSpan.depth = parentSpan.depth + 1
      }
    }
    // console.log('cur span:', curSpan.event)
    // console.log('cur depth:', curSpan.depth)
    // console.log('cur height:', curSpan.height)
  }

  parentSpan.children.forEach((span) => calcDepth(span))
}

// only search left node
function calcMaxDepth(span: IFullSpan) {
  if (span.children.length === 0) {
    return span.depth
  }

  const childrenDepths = span.children.map((span) => calcMaxDepth(span))
  const maxDepth = Math.max(...childrenDepths)
  return maxDepth
}
