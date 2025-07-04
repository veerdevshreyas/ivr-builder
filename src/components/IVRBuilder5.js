// IVRBuilder with drag-and-drop palette, edge delete, and inline node editing
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
      transition={{ duration: 0.2 }}
      style={{
        padding: 16,
        background: "#fff",
        border: "2px solid #007bff",
        borderRadius: 12,
        width: 220,
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        fontFamily: "Inter, sans-serif",
        position: "relative"
      }}
    >
      <Handle type="target" position={Position.Top} id="a" style={{ background: '#007bff' }} />
      <div style={{ fontWeight: 600 }}>{data.label}</div>
      <textarea
        value={data.details}
        onChange={(e) => data.onInlineEdit(id, e.target.value)}
        style={{ width: '100%', height: 60, marginTop: 6, fontSize: 12 }}
      />
      <Handle type="source" position={Position.Bottom} id="b" style={{ background: '#007bff' }} />
      <button
        onClick={(e) => {
          e.stopPropagation();
          data.onDelete(id);
        }}
        style={{ position: 'absolute', top: 4, right: 4, background: '#ffcdd2', border: 'none', borderRadius: 4, fontSize: 12, padding: '2px 5px' }}
      >×</button>
    </motion.div>
  )
};

const IVRBuilder = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowWrapper = useRef(null);
  const [rfInstance, setRfInstance] = useState(null);
  const [draggingType, setDraggingType] = useState(null);

  const onDragStart = (event, type) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
    setDraggingType(type);
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
      <div style={{ display: "flex", height: "100vh" }}>
        <aside style={{ width: 180, padding: 10, background: "#f4f4f4", borderRight: "1px solid #ccc" }}>
          <div
            style={{ padding: 8, marginBottom: 10, background: "#dfefff", borderRadius: 6, cursor: "grab" }}
            onDragStart={(event) => onDragStart(event, "prompt")}
            draggable
          >Prompt</div>
          <div
            style={{ padding: 8, marginBottom: 10, background: "#dfefff", borderRadius: 6, cursor: "grab" }}
            onDragStart={(event) => onDragStart(event, "key")}
            draggable
          >Press-Key</div>
          <div
            style={{ padding: 8, marginBottom: 10, background: "#dfefff", borderRadius: 6, cursor: "grab" }}
            onDragStart={(event) => onDragStart(event, "transfer")}
            draggable
          >Transfer</div>
          <div
            style={{ padding: 8, marginBottom: 10, background: "#dfefff", borderRadius: 6, cursor: "grab" }}
            onDragStart={(event) => onDragStart(event, "hangup")}
            draggable
          >Hangup</div>
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
            <Background gap={20} color="#eee" />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </ReactFlowProvider>
  );
};

export default IVRBuilder;

