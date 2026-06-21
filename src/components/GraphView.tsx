import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

interface GraphNode {
  id: string;
  label: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  loading?: boolean;
  darkMode: boolean;
  activePath: string | null;
  onNodeClick: (id: string) => void;
}

export default function GraphView({
  nodes,
  edges,
  loading,
  darkMode,
  activePath,
  onNodeClick,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    const nodeColor = darkMode ? '#818cf8' : '#6366f1';
    const nodeActiveColor = '#f59e0b';
    const labelColor = darkMode ? '#e2e8f0' : '#1e293b';
    const edgeColor = darkMode ? '#475569' : '#cbd5e1';

    const elements = [
      ...nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          active: n.id === activePath,
        },
      })),
      ...edges.map((e, i) => ({
        data: {
          id: `edge-${i}`,
          source: e.source,
          target: e.target,
        },
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': nodeColor,
            label: 'data(label)',
            color: labelColor,
            'font-size': '11px',
            'font-family':
              'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 'label',
            'height': 'label',
            'padding': '10px 14px',
            shape: 'round-rectangle',
            'border-width': 0,
            'text-wrap': 'wrap',
            'text-max-width': '120px',
            'transition-property':
              'background-color, border-width, border-color',
            'transition-duration': 200,
          },
        },
        {
          selector: 'node[active]',
          style: {
            'background-color': nodeActiveColor,
            'border-width': 2,
            'border-color': darkMode ? '#fcd34d' : '#b45309',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1,
            'line-color': edgeColor,
            'target-arrow-color': edgeColor,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.7,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': darkMode ? '#fff' : '#1e293b',
          },
        },
      ],
      layout: {
        name: 'cose',
        padding: 30,
        nodeOverlap: 20,
        idealEdgeLength: 120,
        nodeRepulsion: 450000,
        edgeElasticity: 100,
        gravity: 80,
        numIter: 2500,
        animate: true,
        animationDuration: 500,
        fit: true,
        componentSpacing: 120,
        nestingFactor: 5,
        randomize: true,
      },
      wheelSensitivity: 0.3,
      minZoom: 0.1,
      maxZoom: 3,
    });

    cy.on('tap', 'node', (event) => {
      onNodeClick(event.target.id());
    });

    return () => {
      cy.destroy();
    };
  }, [nodes, edges, darkMode, activePath, onNodeClick]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
        <div className="text-center">
          <p className="text-sm">Loading graph…</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
        <div className="text-center">
          <p className="text-sm">No notes to display.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full bg-white dark:bg-slate-950 cursor-grab active:cursor-grabbing"
      />
      <div className="absolute bottom-4 left-4 text-xs text-slate-400 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-md shadow-sm border border-slate-200 dark:border-slate-700">
        🖱 Click a node to open · Scroll to zoom · Drag to pan
      </div>
    </div>
  );
}
