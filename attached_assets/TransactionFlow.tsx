import React, { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Panel,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

interface TransactionFlowProps {
  nodes: Node[];
  edges: Edge[];
}

const nodeTypes = {
  wallet: ({ data }: any) => (
    <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-blue-500 min-w-[200px]">
      <div className="font-mono text-sm break-all">{data.label}</div>
      {data.type === 'exchange' && (
        <div className="text-xs text-green-600 mt-1">Exchange</div>
      )}
    </div>
  ),
  exchange: ({ data }: any) => (
    <div className="bg-green-50 p-4 rounded-lg shadow-lg border-2 border-green-500 min-w-[200px]">
      <div className="font-mono text-sm break-all">{data.label}</div>
      <div className="text-xs text-green-600 mt-1">Exchange</div>
    </div>
  ),
};

const defaultEdgeOptions = {
  style: { strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: '#64748b',
  },
  animated: true,
};

export const TransactionFlow: React.FC<TransactionFlowProps> = ({ nodes: initialNodes, edges: initialEdges }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges.map(edge => ({
      ...edge,
      type: 'smoothstep',
      markerEnd: defaultEdgeOptions.markerEnd,
      animated: true,
      label: edge.data.value === 'N/A' ? 'Unknown Value' : `${edge.data.value} ETH`,
      labelStyle: { fill: '#64748b', fontWeight: 500 },
      labelBgStyle: { fill: 'white' },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 4,
    }))
  );

  const onConnect = useCallback((params: any) => {
    setEdges((eds) => [...eds, { ...params, ...defaultEdgeOptions }]);
  }, [setEdges]);

  return (
    <div className="h-[800px] w-full bg-gray-50 rounded-xl shadow-inner">
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
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            switch (node.type) {
              case 'exchange':
                return '#22c55e';
              default:
                return '#3b82f6';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        <Panel position="top-left" className="bg-white p-4 rounded-lg shadow-lg">
          <div className="text-sm font-semibold mb-2">Legend</div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-sm">Wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm">Exchange</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-0.5 w-8 bg-gray-500"></div>
              <span className="text-sm">Transaction Flow</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};