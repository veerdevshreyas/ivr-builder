// IVRBuilder with enhanced UI/UX, animations, hover effects, and styling
import React, { useCallback, useState, useRef } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Handle,
  Position
} from "reactflow";
import "reactflow/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { motion } from "framer-motion";

const nodeTypes = {
  ivrNode: ({ id, data }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      style={{
        padding: 16,
        background: "#ffffff",
        border: "2px solid #007bff",
        borderRadius: 16,
        width: 240,
        boxShadow: "0 6px 12px rgba(0,0,0,0.1)",
        fontFamily: "Inter, sans-serif",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.3s ease-in-out"
      }}
    >
      <Handle type="target" position={Position.Top} id="a" style={{ background: '#007bff' }} />
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: '#333' }}>{data.label}</div>
      <textarea
        value={data.details}
        onChange={(e) => data.onInlineEdit(id, e.target.value)}
        style={{
          width: '100%',
          height: 70,
          border: '1px solid #ccc',
          borderRadius: 8,
          fontSize: 13,
          padding: 6,
          color: '#444',
          resize: 'none'
        }}
      />
      <Handle type="source" position={Position.Bottom} id="b" style={{ background: '#007bff' }} />
      <button
        onClick={(e) => {
          e.stopPropagation();
          data.onDelete(id);
        }}
        style={{
          position: 'absolute', top: 6, right: 6,
          background: '#ff6b6b', color: '#fff', border: 'none',
          borderRadius: '50%', width: 24, height: 24,
          fontSize: 14, cursor: 'pointer', lineHeight: '24px', textAlign: 'center'
        }}
        title="Delete node"
      >×</button>
    </motion.div>
  )
};

const IVRBuilder = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowWrapper = useRef(null);
  const [rfInstance, setRfInstance] = useState(null);

  const onDragStart = (event, type) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const type = event.dataTransfer.getData("application/reactflow");
    if (!rfInstance) return;
    const position = rfInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });
    const id = uuidv4();
    const newNode = {
      id,
      type: "ivrNode",
      position,
      data: {
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
        details: "",
        onDelete: (id) => deleteNode(id),
        onInlineEdit: (id, val) => inlineEdit(id, val),
      },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [rfInstance]);

  const deleteNode = (id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const inlineEdit = (id, value) => {
    setNodes((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, details: value } } : n));
  };

  const onEdgeClick = (event, edge) => {
    event.stopPropagation();
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  };

  return (
    <ReactFlowProvider>
      <div style={{ display: "flex", height: "100vh", fontFamily: 'Inter, sans-serif' }}>
        <aside style={{ width: 200, padding: 16, background: "#f8f9fb", borderRight: "1px solid #e0e0e0" }}>
          <h4 style={{ fontSize: 16, marginBottom: 12, color: '#333' }}>IVR Blocks</h4>
          {['prompt', 'key', 'transfer', 'hangup'].map((type) => (
            <div
              key={type}
              onDragStart={(event) => onDragStart(event, type)}
              draggable
              style={{
                padding: '10px 12px',
                marginBottom: 10,
                background: '#ffffff',
                borderRadius: 8,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                border: '1px solid #cfe2ff',
                cursor: 'grab',
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
          ))}
        </aside>
        <div ref={reactFlowWrapper} style={{ flexGrow: 1, height: "100%" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={(params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds))}
            onInit={setRfInstance}
            nodeTypes={nodeTypes}
            onDrop={onDrop}
            onDragOver={(event) => event.preventDefault()}
            onEdgeClick={onEdgeClick}
            fitView
          >
            <Background gap={20} color="#f0f0f0" />
            <MiniMap nodeColor={() => '#007bff'} nodeStrokeWidth={2} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </div>
    </ReactFlowProvider>
  );
};

export default IVRBuilder;

