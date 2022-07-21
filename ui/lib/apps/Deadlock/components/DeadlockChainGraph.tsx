import { DeadlockModel } from '@lib/client'
import React, { useRef, useState } from 'react'
import { useEffectOnce } from 'react-use'

interface Prop {
    deadlockChain: DeadlockModel[]
    onHover: (id: string) => void
}

function DeadlockChainGraph(prop: Prop) {
    const data = {
        nodes: prop.deadlockChain.map(it => {
            return { id: it.try_lock_trx_id }
        }),
        links: prop.deadlockChain.map((d, i) => ({
            source: i,
            target: prop.deadlockChain.findIndex(it => it.trx_holding_lock == d.try_lock_trx_id),
            type: 'blocked',
            key: d.key
        })),
    }
    interface NodeMeta {
        x: number,
        y: number,
        connectOutX: number,
        connectOutY: number,
        connectInX: number,
        connectInY: number,
    }
    function calcCircularLayout(nodeSize: number, center: { x: number, y: number }, radius: number): Array<NodeMeta> {
        let result: Array<NodeMeta> = [];
        const outAngle = 2 * Math.PI / nodeSize;
        const halfInnerAngle = Math.PI * (nodeSize - 2) / nodeSize / 2;
        let currentNodeConnectOutX = center.x - Math.sin(halfInnerAngle) * 30;
        if (nodeSize == 2) {
            currentNodeConnectOutX = center.x - 30;
        }
        let currentNodeConnectOutY = center.y + radius - Math.cos(halfInnerAngle) * 30;
        if (nodeSize == 2) {
            currentNodeConnectOutY = center.y + radius;
        }
        let currentNodeConnectInX = center.x + Math.sin(halfInnerAngle) * 30;
        let currentNodeConnectInY = center.y + radius - Math.cos(halfInnerAngle);
        let angle = 0;
        for (let i = 0; i < nodeSize; ++i) {
            angle += outAngle;
            const x = center.x + radius * Math.sin(angle);
            const y = center.y + radius * Math.cos(angle);

            result.push({ x: x, y: y, connectOutX: currentNodeConnectOutX, connectOutY: currentNodeConnectOutY, connectInX: currentNodeConnectInX, connectInY: currentNodeConnectInY });

            const newNodeConnectOutX = (currentNodeConnectOutX - center.x) * Math.cos(outAngle) - (currentNodeConnectOutY - center.y) * Math.sin(outAngle) + center.x;
            const newNodeConnectOutY = (currentNodeConnectOutX - center.x) * Math.sin(outAngle) + (currentNodeConnectOutY - center.y) * Math.cos(outAngle) + center.y;
            currentNodeConnectOutX = newNodeConnectOutX;
            currentNodeConnectOutY = newNodeConnectOutY;

            const newNodeConnectInX = (currentNodeConnectInX - center.x) * Math.cos(outAngle) - (currentNodeConnectInY - center.y) * Math.sin(outAngle) + center.x;
            const newNodeConnectInY = (currentNodeConnectInX - center.x) * Math.sin(outAngle) + (currentNodeConnectInY - center.y) * Math.cos(outAngle) + center.y;
            currentNodeConnectInX = newNodeConnectInX;
            currentNodeConnectInY = newNodeConnectInY;

        }
        console.log(result);
        return result;
    }
    const outAngle = 360 / data.nodes.length;
    const layout = calcCircularLayout(data.nodes.length, {x: 150, y: 150}, 100);
    return (
        <svg className="container" height={300} width={300}>
            <defs>
                <marker id="triangle" markerUnits="strokeWidth" markerWidth="5" markerHeight="4" refX="5" refY="2" orient="auto">
                    <path d="M 0 0 L 5 2 L 0 4 z" />
                </marker>
            </defs>
            {data.links.map((link, index) => (
                <path
                    d={`
                    M ${layout[link.source].connectInX},${layout[link.source].connectInY}
                    A 100,100 ${-outAngle} 0,0 ${layout[link.target].connectOutX},${layout[link.target].connectOutY}`}
                    key={`line-${index}`}
                    fill="none"
                    stroke="#4679BD"
                    markerEnd="url(#triangle)"
                />
            ))}
            {data.nodes.map((n, i) => (
                <g key={n.id}>
                    <circle cx={layout[i].x} cy={layout[i].y} r={30} fill="white" stroke="#000" />
                    <text textAnchor="middle" x={layout[i].x} y={layout[i].y+5}>
                        {n.id?.toString().slice(n.id.toString().length - 6)}
                    </text>
                </g>
            ))}
        </svg>
    )
}

export default DeadlockChainGraph