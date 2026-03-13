import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { TYPE_COLORS } from '../data/constants'
import { CONNECTORS } from '../data/connectors'

export function TopologyTab({ graphData, selectedEntity, navigateTo }) {
  const svgRef = useRef(null)
  const simRef = useRef(null)
  const [hoveredNode, setHoveredNode] = useState(null)

  useEffect(() => {
    if (!svgRef.current || !graphData.nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    const g = svg.append('g')

    // Zoom behavior
    svg.call(
      d3.zoom().scaleExtent([0.1, 4]).on('zoom', e => g.attr('transform', e.transform))
    )

    // Force simulation
    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links)
        .id(d => d.id)
        .distance(100)
        .strength(0.4)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40))

    simRef.current = simulation

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(graphData.links)
      .enter()
      .append('line')
      .attr('stroke', '#64748b')
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', 1.5)

    // Link labels (signal names)
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(graphData.links.filter(l => l.signals?.length))
      .enter()
      .append('text')
      .attr('class', 'graph-tooltip')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .style('font-family', "'JetBrains Mono', monospace")
      .style('font-size', '9px')
      .style('fill', '#10b981')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.8)')
      .text(d => d.signals?.slice(0, 1).map(s => s.id).join(', '))

    // Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(graphData.nodes)
      .enter()
      .append('g')
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
      )
      .on('click', (e, d) => {
        e.stopPropagation()
        navigateTo('connector', d.id)
      })
      .on('mouseenter', (e, d) => setHoveredNode(d.id))
      .on('mouseleave', () => setHoveredNode(null))

    node.append('circle')
      .attr('r', d => 12 + Math.sqrt(d.pinCount) * 1.5)
      .attr('fill', d => TYPE_COLORS[d.type] + '33')
      .attr('stroke', d => TYPE_COLORS[d.type])
      .attr('stroke-width', d => hoveredNode === d.id ? 3 : 2)

    node.append('text')
      .attr('dy', d => 16 + Math.sqrt(d.pinCount) * 1.5)
      .attr('text-anchor', 'middle')
      .style('fill', '#e2e8f0')
      .style('font-family', "'JetBrains Mono', monospace")
      .style('font-size', '11px')
      .style('font-weight', 700)
      .text(d => d.id)

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      linkLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    function dragStarted(e, d) {
      if (!e.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(e, d) {
      d.fx = e.x
      d.fy = e.y
    }

    function dragEnded(e, d) {
      if (!e.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    // Background click to deselect
    svg.on('click', () => navigateTo(null))

    return () => {
      simulation.stop()
    }
  }, [graphData, navigateTo])

  const selectedConn = selectedEntity?.type === 'connector' ? selectedEntity.id : null
  const selectedNode = graphData.nodes.find(n => n.id === selectedConn)

  return (
    <div className="topology-page">
      <svg ref={svgRef} className="topology-svg" />
      <div className="topology-legend">
        <div className="legend-entry">
          <div className="legend-dot" style={{ background: TYPE_COLORS.controller }} />
          <span>控制器</span>
        </div>
        <div className="legend-entry">
          <div className="legend-dot" style={{ background: TYPE_COLORS.amplifier }} />
          <span>功放</span>
        </div>
        <div className="legend-entry">
          <div className="legend-dot" style={{ background: TYPE_COLORS.speaker }} />
          <span>揚聲器</span>
        </div>
        <div className="legend-entry">
          <div className="legend-dot" style={{ background: TYPE_COLORS.passthrough }} />
          <span>直通</span>
        </div>
        <div className="legend-entry">
          <div className="legend-dot" style={{ background: TYPE_COLORS.bus }} />
          <span>匯流排</span>
        </div>
      </div>

      {selectedNode && (
        <div className="topology-info-card">
          <h3>{selectedNode.id}</h3>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>{selectedNode.module}</div>
          <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 12 }}>{selectedNode.description}</p>
          <div style={{ fontSize: 11 }}>
            <strong>腳位數：</strong> {selectedNode.pinCount}
          </div>
          <div className="info-signals">
            {graphData.links
              .filter(l => l.source.id === selectedNode.id || l.target.id === selectedNode.id)
              .flatMap(l => l.signals || [])
              .slice(0, 8)
              .map(sig => (
                <div
                  key={sig.id}
                  className="info-signal-item"
                  onClick={() => navigateTo('signal', sig.id)}
                >
                  <span style={{ fontWeight: 700 }}>{sig.id}</span>
                  <span style={{ opacity: 0.6 }}>{sig.name}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
