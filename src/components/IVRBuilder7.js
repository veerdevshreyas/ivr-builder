// IVRBuilder – Fully Configurable Flow Builder with Block Configuration Modal
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
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

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
        width: 260,
        boxShadow: "0 6px 12px rgba(0,0,0,0.1)",
        fontFamily: "Inter, sans-serif",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <Handle type="target" position={Position.Top} id="a" style={{ background: '#007bff' }} />
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: '#333' }}>{data.label}</div>
      <div style={{ fontSize: 13, color: '#444', marginBottom: 8 }}>{data.summary || "(Double-click to configure)"}</div>
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
  const [showModal, setShowModal] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [configData, setConfigData] = useState({});

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
        summary: "",
        onDelete: (id) => deleteNode(id),
        onConfigure: () => openModal(id),
      },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [rfInstance]);

  const deleteNode = (id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const openModal = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setEditingNode(nodeId);
      setConfigData({ summary: node.data.summary || "" });
      setShowModal(true);
    }
  };

  const handleSaveConfig = () => {
    setNodes(nds => nds.map(n =>
      n.id === editingNode ? { ...n, data: { ...n.data, summary: configData.summary } } : n
    ));
    setShowModal(false);
  };

  const onEdgeClick = (event, edge) => {
    event.stopPropagation();
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  };

  return (
    <ReactFlowProvider>
      <div style={{ display: "flex", height: "100vh", fontFamily: 'Inter, sans-serif' }}>
        <aside style={{ width: 220, padding: 16, background: "#f8f9fb", borderRight: "1px solid #e0e0e0" }}>
          <h4 style={{ fontSize: 16, marginBottom: 12, color: '#333' }}>IVR Blocks</h4>
          {['prompt', 'key', 'transfer', 'hangup', 'api'].map((type) => (
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
                cursor: 'grab'
              }}
            >
              {type === 'api' ? 'API Trigger' : type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
          ))}
        </aside>
        <div ref={reactFlowWrapper} style={{ flexGrow: 1, height: "100%" }}>
          <ReactFlow
            nodes={nodes.map(n => ({
              ...n,
              data: {
                ...n.data,
                onDelete: deleteNode,
                onInlineEdit: () => {},
                onConfigure: () => openModal(n.id)
              }
            }))}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={(params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds))}
            onInit={setRfInstance}
            nodeTypes={nodeTypes}
            onDrop={onDrop}
            onDragOver={(event) => event.preventDefault()}
            onEdgeClick={onEdgeClick}
            onNodeDoubleClick={(_, node) => openModal(node.id)}
            fitView
          >
            <Background gap={20} color="#f0f0f0" />
            <MiniMap nodeColor={() => '#007bff'} nodeStrokeWidth={2} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Configure Node</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Details / Summary</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={configData.summary}
                onChange={(e) => setConfigData({ ...configData, summary: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveConfig}>Save</Button>
          </Modal.Footer>
        </Modal>
      </div>
    </ReactFlowProvider>
  );
};

export default IVRBuilder;

