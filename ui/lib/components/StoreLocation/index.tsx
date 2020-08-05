import 'echarts/lib/chart/tree'
import 'echarts/lib/component/grid'
import 'echarts/lib/component/legend'
import 'echarts/lib/component/tooltip'

import { Space } from 'antd'
//import dayjs from 'dayjs'
import ReactEchartsCore from 'echarts-for-react/lib/core'
import echarts from 'echarts/lib/echarts'
import _ from 'lodash'
import React, { useMemo, useRef } from 'react'
//import { useInterval } from 'react-use'
//import format from 'string-template'
import { LoadingOutlined, ReloadOutlined } from '@ant-design/icons'
//import { getValueFormat } from '@baurine/grafana-value-formats'

//import client from '@lib/client'
import { AnimatedSkeleton, Card } from '@lib/components'
//import { useBatchClientRequest } from '@lib/utils/useClientRequest'
//import ErrorBar from '../ErrorBar'

export type GraphType = 'tree'

export interface IStoreLocationProps {
  dataSource: any
  title: React.ReactNode
  type: GraphType
}
const HEIGHT = 250

export default function StoreLocation({
    dataSource,
    title,
    type,
}: IStoreLocationProps)  {
  
    const opt ={
        tooltip: {    //提示框组件
            trigger: 'item',    //触发类型，默认：item（数据项图形触发，主要在散点图，饼图等无类目轴的图表中使用）。可选：'axis'：坐标轴触发，主要在柱状图，折线图等会使用类目轴的图表中使用。'none':什么都不触发。
            triggerOn: 'mousemove'    //提示框触发的条件，默认mousemove|click（鼠标点击和移动时触发）。可选mousemove：鼠标移动时，click：鼠标点击时，none：        
        },
        series: [    //系列列表
            {
                type: 'tree',    //树形结构
 
                data: [dataSource],    //上面从flare.json中得到的数据
 
                top: '1%',       //距离上
                left: '7%',      //左
                bottom: '1%',    //下
                right: '20%',    //右的距离
 
                symbolSize: 7,   //标记的大小，就是那个小圆圈，默认7
 
                label: {         //每个节点所对应的标签的样式
                    normal: {
                        position: 'left',       //标签的位置
                        verticalAlign: 'middle',//文字垂直对齐方式，默认自动。可选：top，middle，bottom
                        align: 'right',         //文字水平对齐方式，默认自动。可选：top，center，bottom
                        fontSize: 9             //标签文字大小
                    }
                },
 
                leaves: {    //叶子节点的特殊配置，如上面的树图示例中，叶子节点和非叶子节点的标签位置不同
                    label: {
                        normal: {
                            position: 'right',
                            verticalAlign: 'middle',
                            align: 'left'
                        }
                    }
                },
 
                expandAndCollapse: true,    //子树折叠和展开的交互，默认打开
                animationDuration: 550,     //初始动画的时长，支持回调函数,默认1000
                animationDurationUpdate: 750//数据更新动画的时长，默认300
            }
        ]
      };

   let inner 

   /*return(
      <ReactEchartsCore
        echarts={echarts}
        lazyUpdate={true}
        style={{ height: HEIGHT }}
        option={opt}
        theme={'light'}
        
      />
    )*/
    inner = (
        <ReactEchartsCore
          echarts={echarts}
          lazyUpdate={true}
          style={{ height: HEIGHT }}
          option={opt}
          theme={'light'}
        />
      )
    
  
    const update = () => {
    }

const subTitle = (
      <Space>
        <a onClick={update}>
          <ReloadOutlined />
        </a>
      </Space>
    )
    return (
      <Card title={title} subTitle={subTitle}>
        <AnimatedSkeleton >{inner}</AnimatedSkeleton>
      </Card>
    )
  
  }