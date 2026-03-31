import React, { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  MarkerType,
  Node as FlowNode,
  Edge as FlowEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Node, Edge } from './types';

interface TransactionFlowProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick?: (address: string) => void;
}

// Custom node renderers
const nodeTypes = {
  wallet: ({ data }: { data: any }) => (
    <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-blue-500 min-w-[200px]">
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full mr-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <div className="font-mono text-sm text-black font-medium break-all">{data.label}</div>
      </div>
      <div className="text-xs bg-blue-50 text-blue-700 py-1 px-2 rounded">Wallet</div>
    </div>
  ),
  exchange: ({ data }: { data: any }) => (
    <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-green-500 min-w-[200px]">
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 flex items-center justify-center bg-green-100 rounded-full mr-2">
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        </div>
        <div className="font-mono text-sm text-black font-medium break-all">{data.label}</div>
      </div>
      <div className="text-xs bg-green-50 text-green-700 py-1 px-2 rounded">Exchange</div>
    </div>
  ),
};

// Default edge styling
const defaultEdgeOptions = {
  style: { 
    strokeWidth: 2,
    stroke: '#3b82f6'
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: '#3b82f6',
    strokeWidth: 2,
  },
  animated: true,
  type: 'smoothstep',
  labelStyle: { fill: '#000000', fontWeight: 600 },
  labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
  labelBgPadding: [8, 4] as [number, number],
  labelBgBorderRadius: 4,
};

export const TransactionFlow: React.FC<TransactionFlowProps> = ({ 
  nodes: initialNodes, 
  edges: initialEdges,
  onNodeClick 
}) => {
  // State for nodes and edges in the flow
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as FlowNode[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges.map(edge => {
      // Determine if this is an outgoing edge from the source node
      const isFromSource = edge.source === initialNodes[0]?.id;
      
      return {
        ...edge,
        type: 'smoothstep',
        markerEnd: {
          ...defaultEdgeOptions.markerEnd,
          color: isFromSource ? '#ef4444' : '#22c55e', // Red for outgoing, green for incoming
          strokeWidth: 2,
        },
        animated: true,
        style: {
          ...defaultEdgeOptions.style,
          stroke: isFromSource ? '#ef4444' : '#22c55e', // Red for outgoing, green for incoming
          strokeWidth: isFromSource ? 3 : 2, // Slightly thicker for outgoing
          strokeDasharray: isFromSource ? undefined : '5,5', // Dashed for incoming
        },
        label: edge.data.value === 'N/A' ? 'Unknown Value' : `${edge.data.value}`,
        labelStyle: { fill: '#000000', fontWeight: 600 },
        labelBgStyle: { fill: 'white', fillOpacity: 0.9, stroke: isFromSource ? '#fca5a5' : '#86efac', strokeWidth: 1 },
        labelBgPadding: [8, 4] as [number, number],
        labelBgBorderRadius: 4,
      }
    }) as FlowEdge[]
  );

  // Handle connection between nodes
  const onConnect = useCallback((params: any) => {
    setEdges((eds) => [...eds, { ...params, ...defaultEdgeOptions }]);
  }, [setEdges]);

  // Use ReactFlow's built-in zoom functionality
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  const handleZoomIn = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn();
    }
  };
  
  const handleZoomOut = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut();
    }
  };
  
  const handleResetZoom = () => {
    if (reactFlowInstance) {
      reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 });
    }
  };

  return (
    <div className="h-[800px] w-full bg-gray-50 rounded-xl shadow-inner overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        attributionPosition="bottom-right"
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        minZoom={0.2}
        maxZoom={2}
        onInit={setReactFlowInstance}
        onNodeClick={(_, node) => {
          if (onNodeClick && node.data.address) {
            onNodeClick(node.data.address);
          }
        }}
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={(node: FlowNode) => {
            switch (node.type) {
              case 'exchange':
                return '#22c55e';
              default:
                return '#3b82f6';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        <Panel position="top-right" className="bg-white p-3 rounded-lg shadow-lg">
          <div className="flex gap-2">
            <button 
              onClick={handleZoomIn}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              title="Zoom in"
            >
              +
            </button>
            <button 
              onClick={handleZoomOut}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              title="Zoom out"
            >
              -
            </button>
            <button 
              onClick={handleResetZoom}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              title="Reset view"
            >
              Reset
            </button>
          </div>
        </Panel>
        
        {/* Legend explaining the flow visualization */}
        <Panel position="bottom-left" className="bg-white p-3 rounded-lg shadow-lg">
          <div className="text-sm font-medium mb-2 text-black">Transaction Legend</div>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center">
              <div className="w-6 h-3 bg-red-500 rounded-sm mr-2"></div>
              <span className="text-xs text-black">Outgoing Transaction</span>
            </div>
            <div className="flex items-center">
              <div className="w-6 h-3 bg-green-500 rounded-sm mr-2 border border-dashed border-green-500"></div>
              <span className="text-xs text-black">Incoming Transaction</span>
            </div>
            <div className="flex items-center">
              <div className="w-6 h-6 flex items-center justify-center bg-blue-100 rounded-full mr-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
              <span className="text-xs text-black">Wallet Address</span>
            </div>
            <div className="flex items-center">
              <div className="w-6 h-6 flex items-center justify-center bg-green-100 rounded-full mr-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <span className="text-xs text-black">Exchange Address</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};