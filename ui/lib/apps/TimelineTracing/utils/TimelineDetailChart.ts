import { ScaleLinear, scaleLinear } from 'd3'
import { IFlameGraph, IFullSpan } from './flameGraph'

type Pos = {
  x: number
  y: number
}
type Window = {
  left: number
  right: number
}
type TimeRange = {
  start: number
  end: number
}
enum Action {
  None,
  SelectWindow,
  MoveWindowLeft,
  MoveWindowRight,
  MoveWindow,
}

export class TimelineDetailChart {
  private context: CanvasRenderingContext2D

  // dimensions
  private width: number = 0
  private height: number = 0
  private dragAreaHeight: number = 0

  // timeDuration
  private timeDuration: number = 0 // unit?
  private minSelectedTimeDuration: number = 0
  private selectedTimeRange: TimeRange = { start: 0, end: 0 }
  private timeLenScale: ScaleLinear<number, number> = scaleLinear()

  // window
  private curWindow: Window = { left: 0, right: 0 }
  private mouseDownWindow: Window = { left: 0, right: 0 }

  // mouse pos
  private curMousePos: Pos = { x: 0, y: 0 }
  private mouseDownPos: Pos | null = null

  // action
  private action = Action.None

  // draw dimensions and style
  static WINDOW_MIN_WIDTH = 6
  static WINDOW_RESIZE_LINE_WIDTH = 4
  static WINDOW_RESIZE_LINE_WIDTH_HALF =
    TimelineDetailChart.WINDOW_RESIZE_LINE_WIDTH / 2
  static WINDOW_RESIZE_STROKE_STYLE = '#ccc'
  static WINDOW_BORDER_STORKE_STYLE = '#d0d0d0'
  static WINDOW_BORDER_ALPHA = 1.0
  static WINDOW_BORDER_WIDTH = 1
  static UNSELECTED_WINDOW_FILL_STYLE = '#f0f0f0'
  static UNSELECTED_WINDOW_ALPHA = 0.6
  static SELECTED_WINDOW_FILL_STYLE = 'cornflowerblue'
  static SELECTED_WINDOW_ALPHA = 0.3
  static MOVED_VERTICAL_LINE_STROKE_STYLE = 'cornflowerblue'
  static MOVED_VERTICAL_LINE_WIDTH = 2

  static LAYER_HEIGHT = 20

  // flameGraph
  private flameGraph: IFlameGraph

  /////////////////////////////////////
  // setup
  constructor(container: HTMLDivElement, flameGraph: IFlameGraph) {
    const canvas = document.createElement('canvas')
    this.context = canvas.getContext('2d')!
    container.append(canvas)

    this.flameGraph = flameGraph

    this.setTimeDuration(flameGraph.rootSpan.duration_ns!)
    this.setDimensions()
    this.fixPixelRatio()
    this.setTimeLenScale()

    this.draw()
    this.registerHanlers()
  }

  setTimeDuration(timeDuration: number) {
    this.timeDuration = timeDuration
    this.minSelectedTimeDuration = this.timeDuration / 1000
    this.selectedTimeRange = { start: 0, end: timeDuration }
  }

  setDimensions() {
    const container = this.context.canvas.parentElement
    this.width = container!.clientWidth
    this.height =
      TimelineDetailChart.LAYER_HEIGHT * (this.flameGraph.maxDepth + 1)
  }

  fixPixelRatio() {
    // https://developer.mozilla.org/zh-CN/docs/Web/API/Window/devicePixelRatio
    const dpr = window.devicePixelRatio || 1

    this.context.canvas.style.width = this.width + 'px'
    this.context.canvas.style.height = this.height + 'px'
    this.context.canvas.width = this.width * dpr
    this.context.canvas.height = this.height * dpr

    this.context.scale(dpr, dpr)
  }

  // call it when timeDuration or width change
  setTimeLenScale() {
    const { start, end } = this.selectedTimeRange
    this.timeLenScale = scaleLinear()
      .domain([start, end])
      .range([0, this.width])
  }

  /////////////////////////////////////
  //
  setTimeRange(newTimeRange: TimeRange) {
    this.selectedTimeRange = newTimeRange
    this.setTimeLenScale()
    this.draw()
  }

  /////////////////////////////////////
  // event handlers: mousedown, mousemove, mouseup, mousewheel, resize
  registerHanlers() {
    window.addEventListener('resize', this.onResize)
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event
    this.context.canvas.addEventListener('wheel', this.onMouseWheel)
    // this.context.canvas.addEventListener('mousedown', this.onMouseDown)
    // this.context.canvas.addEventListener('mousemove', this.onCanvasMouseMove)
    // this.context.canvas.addEventListener('mouseout', this.onCanvasMouseOut)
    // window.addEventListener('mousemove', this.onWindowMouseMove)
    // window.addEventListener('mouseup', this.onMouseUp)
  }

  onResize = () => {
    this.setDimensions()
    this.fixPixelRatio()
    this.setTimeLenScale()
    this.draw()
  }

  // save initial pos and window
  onMouseDown = (event) => {
    event.preventDefault() // prevent selection

    const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
    this.mouseDownPos = loc
    this.mouseDownWindow = { ...this.curWindow }
  }

  // recover mouse cursor
  onCanvasMouseOut = (event) => {
    event.preventDefault()

    const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
    this.updateAction(loc)
    this.curMousePos = loc
    this.draw()
  }

  // save action type
  onCanvasMouseMove = (event) => {
    event.preventDefault()

    // when mouse is down, the event will propagate to window
    if (this.mouseDownPos) return

    const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
    this.updateAction(loc)
    this.curMousePos = loc
    this.draw()
  }

  // handle kinds of action
  onWindowMouseMove = (event) => {
    event.preventDefault()

    // only response when mouse is down
    if (this.mouseDownPos === null) return

    const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
    this.updateWindow(loc)
    this.curMousePos = loc
    this.draw()
  }

  // update action type and window both
  onMouseUp = (event) => {
    event.preventDefault()

    const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
    this.updateAction(loc)
    this.curMousePos = loc

    // update window
    if (this.action === Action.SelectWindow && this.mouseDownPos) {
      let { x } = loc
      if (x < 0) x = 0
      if (x > this.width) x = this.width
      let newLeft = Math.min(this.mouseDownPos.x, x)
      let newRight = Math.max(this.mouseDownPos.x, x)
      if (newRight - newLeft < 2 * TimelineDetailChart.WINDOW_MIN_WIDTH) {
        newLeft = Math.max(0, newLeft - TimelineDetailChart.WINDOW_MIN_WIDTH)
        newRight = Math.min(
          this.width,
          newRight + TimelineDetailChart.WINDOW_MIN_WIDTH
        )
      }
      this.curWindow = { left: newLeft, right: newRight }
      this.selectedTimeRange = this.windowToTimeRange(this.curWindow)
    }

    // release mouse
    this.mouseDownPos = null
    this.draw()
  }

  onMouseWheel = (event) => {
    event.preventDefault()

    const ev = event as WheelEvent
    const { start, end } = this.selectedTimeRange
    const byDelta = (end - start) / 10
    let newStart = start
    let newEnd = end
    if (ev.deltaY > 0) {
      // enlarge selected window
      newStart = start - byDelta
      let unUsedDelta = 0
      if (newStart < 0) {
        unUsedDelta = -newStart
        newStart = 0
      }
      newEnd = end + byDelta + unUsedDelta
      if (newEnd > this.timeDuration) {
        newEnd = this.timeDuration
      }
    } else {
      // shrink selected window
      if (end - start <= this.minSelectedTimeDuration) {
        // can't shrink more
        return
      }
      newStart = start + byDelta
      newEnd = end - byDelta
      if (newEnd - newStart <= this.minSelectedTimeDuration) {
        newEnd = newStart + this.minSelectedTimeDuration
      }
    }
    this.setTimeRange({ start: newStart, end: newEnd })
  }

  updateAction(loc: Pos) {
    // only change it when mouse isn't down
    if (this.mouseDownPos) return

    const { left, right } = this.curWindow
    if (this.mouseOutsideCanvas(loc)) {
      this.action = Action.None
    } else if (loc.y > this.dragAreaHeight) {
      this.action = Action.SelectWindow
    } else if (
      loc.x > left - TimelineDetailChart.WINDOW_RESIZE_LINE_WIDTH_HALF &&
      loc.x < left + TimelineDetailChart.WINDOW_RESIZE_LINE_WIDTH_HALF
    ) {
      this.action = Action.MoveWindowLeft
    } else if (
      loc.x > right - TimelineDetailChart.WINDOW_RESIZE_LINE_WIDTH_HALF &&
      loc.x < right + TimelineDetailChart.WINDOW_RESIZE_LINE_WIDTH_HALF
    ) {
      this.action = Action.MoveWindowRight
    } else {
      this.action = Action.MoveWindow
    }
    this.updateCursor()
  }

  updateCursor() {
    // https://developer.mozilla.org/zh-CN/docs/Web/CSS/cursor
    let cursor: string
    switch (this.action) {
      case Action.SelectWindow:
        cursor = 'text'
        break
      case Action.MoveWindowLeft:
      case Action.MoveWindowRight:
        cursor = 'ew-resize'
        break
      case Action.MoveWindow:
        cursor = 'grab'
        break
      default:
        cursor = 'initial'
        break
    }
    document.body.style.cursor = cursor
  }

  updateWindow(loc: Pos) {
    const { left, right } = this.curWindow
    let newLeft: number = left
    let newRight: number = right
    if (this.action === Action.MoveWindowLeft) {
      if (loc.x < 0) {
        newLeft = 0
      } else if (loc.x > right - TimelineDetailChart.WINDOW_MIN_WIDTH) {
        newLeft = right - TimelineDetailChart.WINDOW_MIN_WIDTH
      } else {
        newLeft = loc.x
      }
    } else if (this.action === Action.MoveWindowRight) {
      if (loc.x > this.width) {
        newRight = this.width
      } else if (loc.x < left + TimelineDetailChart.WINDOW_MIN_WIDTH) {
        newRight = left + TimelineDetailChart.WINDOW_MIN_WIDTH
      } else {
        newRight = loc.x
      }
    } else if (this.action === Action.MoveWindow) {
      let delta = loc.x - this.mouseDownPos!.x
      const { left, right } = this.mouseDownWindow
      if (delta < -left) {
        delta = -left
      } else if (delta > this.width - right) {
        delta = this.width - right
      }
      newLeft = left + delta
      newRight = right + delta
    }

    if (this.mouseDownPos !== null) {
      this.curWindow = { left: newLeft, right: newRight }
      this.selectedTimeRange = this.windowToTimeRange(this.curWindow)
    }
  }

  /////////////////////////////////////
  // draw
  draw() {
    this.context.clearRect(0, 0, this.width, this.height)
    // this.drawTimePointsAndVerticalLines()
    // this.drawWindow()
    // this.drawMoveVerticalLine()
    // this.drawSelectedWindow()
    this.drawFlameGraph()
  }

  drawTimePointsAndVerticalLines() {
    this.context.save()
    // text
    this.context.textAlign = 'end'
    this.context.textBaseline = 'top'
    // vertical lines
    this.context.strokeStyle = '#ccc'
    this.context.lineWidth = 0.5

    let timeDelta = this.calcXAxisTimeDelta()
    let i = 0
    while (true) {
      i++
      const x = Math.round(this.timeLenScale(timeDelta * i))
      if (x > this.width) {
        break
      }
      // text
      this.context.fillText(`${timeDelta * i} ms`, x - 2, 2)
      // vertical line
      this.context.beginPath()
      this.context.moveTo(x + 0.5, 0)
      this.context.lineTo(x + 0.5, this.height)
      this.context.stroke()
    }
    this.context.restore()
  }

  drawWindow() {
    const { left, right } = this.curWindow

    this.context.save()

    // draw unselected window area
    this.context.globalAlpha = TimelineDetailChart.UNSELECTED_WINDOW_ALPHA
    this.context.fillStyle = TimelineDetailChart.UNSELECTED_WINDOW_FILL_STYLE
    this.context.fillRect(0, 0, left, this.height)
    this.context.fillRect(right, 0, this.width, this.height)

    // draw window left and right borders
    this.context.globalAlpha = TimelineDetailChart.WINDOW_BORDER_ALPHA
    this.context.strokeStyle = TimelineDetailChart.WINDOW_BORDER_STORKE_STYLE
    this.context.lineWidth = TimelineDetailChart.WINDOW_BORDER_WIDTH
    this.context.beginPath()
    this.context.moveTo(left, 0)
    this.context.lineTo(left, this.height)
    this.context.stroke()
    this.context.beginPath()
    this.context.moveTo(right, 0)
    this.context.lineTo(right, this.height)
    this.context.stroke()

    // draw resize area
    this.context.strokeStyle = TimelineDetailChart.WINDOW_RESIZE_STROKE_STYLE
    this.context.lineWidth = TimelineDetailChart.WINDOW_RESIZE_LINE_WIDTH
    this.context.beginPath()
    this.context.moveTo(left, 0)
    this.context.lineTo(left, this.dragAreaHeight)
    this.context.stroke()
    this.context.beginPath()
    this.context.moveTo(right, 0)
    this.context.lineTo(right, this.dragAreaHeight)
    this.context.stroke()

    this.context.restore()
  }

  drawMoveVerticalLine() {
    // not draw it when mouse move outside the canvas
    // to keep same as the chrome dev tool
    if (
      this.action !== Action.SelectWindow ||
      this.mouseOutsideCanvas(this.curMousePos)
    ) {
      return
    }

    this.context.save()
    this.context.strokeStyle =
      TimelineDetailChart.MOVED_VERTICAL_LINE_STROKE_STYLE
    this.context.lineWidth = TimelineDetailChart.MOVED_VERTICAL_LINE_WIDTH
    this.context.beginPath()
    this.context.moveTo(this.curMousePos.x, 0)
    this.context.lineTo(this.curMousePos.x, this.height)
    this.context.stroke()
    this.context.restore()
  }

  drawSelectedWindow() {
    if (this.mouseDownPos === null || this.action !== Action.SelectWindow) {
      return
    }

    this.context.save()
    this.context.globalAlpha = TimelineDetailChart.SELECTED_WINDOW_ALPHA
    this.context.fillStyle = TimelineDetailChart.SELECTED_WINDOW_FILL_STYLE
    if (this.curMousePos.x > this.mouseDownPos.x) {
      this.context.fillRect(
        this.mouseDownPos.x,
        0,
        this.curMousePos.x - this.mouseDownPos.x,
        this.height
      )
    } else {
      this.context.fillRect(
        this.curMousePos.x,
        0,
        this.mouseDownPos.x - this.curMousePos.x,
        this.height
      )
    }
    this.context.restore()
  }

  drawFlameGraph() {
    this.context.save()
    this.drawSpan(this.flameGraph.rootSpan)
    this.context.restore()
  }

  drawSpan(span: IFullSpan) {
    const { start, end } = this.selectedTimeRange
    const inside =
      span.end_unix_time_ns > start || span.begin_unix_time_ns! < end

    if (inside) {
      if (span.node_type === 'TiDB') {
        this.context.fillStyle = '#aab254'
      } else {
        this.context.fillStyle = '#507359'
      }
      let x = this.timeLenScale(span.begin_unix_time_ns!)
      if (x < 0) {
        x = 0
      }
      const y = span.depth * 20
      const width = Math.max(this.timeLenScale(span.end_unix_time_ns!) - x, 0.5)
      const height = 19

      this.context.fillRect(x, y, width, height)

      const deltaDepth = span.depth - span.parentDepth
      if (deltaDepth > 1) {
        this.context.strokeStyle = this.context.fillStyle
        this.context.lineWidth = 0.5
        this.context.beginPath()
        this.context.moveTo(x, y)
        this.context.lineTo(
          x,
          y - deltaDepth * TimelineDetailChart.LAYER_HEIGHT
        )
        this.context.stroke()
      }

      // text
      if (width > this.context.measureText(span.event!).width) {
        this.context.textAlign = 'left'
        this.context.textBaseline = 'middle'
        this.context.fillStyle = 'white'
        this.context.fillText(span.event!, x + 2, y + 10)
      }
    }

    span.children.forEach((s) => this.drawSpan(s))
  }

  /////////////////////////////////////////
  // utils
  windowToCanvasLoc(windowX: number, windowY: number) {
    const canvasBox = this.context.canvas.getBoundingClientRect()
    return {
      x: windowX - canvasBox.left,
      y: windowY - canvasBox.top,
    }
  }

  windowToTimeRange(window: Window): TimeRange {
    return {
      start: this.timeLenScale.invert(window.left),
      end: this.timeLenScale.invert(window.right),
    }
  }

  timeRangeToWindow(timeRange: TimeRange): Window {
    const { start, end } = timeRange
    return {
      left: this.timeLenScale(start),
      right: this.timeLenScale(end),
    }
  }

  mouseOutsideCanvas(loc: Pos) {
    return loc.x < 0 || loc.y < 0 || loc.x > this.width || loc.y > this.height
  }

  calcXAxisTimeDelta() {
    const defTimeDelta = this.timeLenScale.invert(100) // how long the 100px represents
    // nice the defTimeDelta, for example: 1980ms -> 2000ms
    let timeDelta = defTimeDelta
    let step = 1
    while (timeDelta > 10) {
      timeDelta /= 10
      step *= 10
    }
    // TODO: handle situation when timeDelta < 10
    if (step > 1) {
      timeDelta = Math.round(timeDelta) * step
    }
    return timeDelta
  }
}
