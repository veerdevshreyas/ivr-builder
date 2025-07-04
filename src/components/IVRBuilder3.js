import React, { useCallback, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  useReactFlow
} from "reactflow";
import "reactflow/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { motion } from "framer-motion";

const nodeTypes = {
  ivrNode: ({ id, data }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        padding: 16,
        background: "#fdfdfd",
        border: "2px solid #4a90e2",
        borderRadius: 12,
        width: 200,
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        position: "relative",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#4a90e2' }} />
      <strong style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#333" }}>{data.label}</strong>
      <div style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "#555" }}>{data.details}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#4a90e2' }} />
      <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
        <button
          style={{
            fontSize: 10,
            background: '#e1f0ff',
            border: '1px solid #b0d8ff',
            borderRadius: 4,
            padding: '2px 4px'
          }}
          onClick={(e) => {
            e.stopPropagation();
            data.onEdit(id);
          }}
        >✎</button>
        <button
          style={{
            fontSize: 10,
            background: '#ffebeb',
            border: '1px solid #ffc7c7',
            borderRadius: 4,
            padding: '2px 4px'
          }}
          onClick={(e) => {
            e.stopPropagation();
            data.onDelete(id);
          }}
        >✕</button>
      </div>
    </motion.div>
  ),
};

const IVRBuilder = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: "start",
      type: "ivrNode",
      position: { x: 100, y: 100 },
      data: { label: "Start", details: "", onDelete: () => {}, onEdit: () => {} },
    },
  ]);

  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState("prompt");
  const [formData, setFormData] = useState({});
  const [sourceNode, setSourceNode] = useState("start");
  const [selectedNode, setSelectedNode] = useState(null);
  const [editNodeId, setEditNodeId] = useState(null);
  const [rfInstance, setRfInstance] = useState(null);

  const deleteNode = (id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const editNode = (id) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    setEditNodeId(id);
    setSelectedType(node.data.label.toLowerCase().split(" ")[0]);
    if (node.data.label.toLowerCase().includes("prompt")) {
      setFormData({ message: node.data.details.replace("Message: ", "") });
    } else if (node.data.label.toLowerCase().includes("key")) {
      const lines = node.data.details.split("\n").slice(1);
      const options = Object.fromEntries(lines.map(l => l.split(": ")));
      setFormData({ options, raw: lines.map(([k, v]) => `${k}:${v}`).join(",") });
    } else if (node.data.label.toLowerCase().includes("transfer")) {
      setFormData({ destination: node.data.details.replace("Transfer to: ", "") });
    } else {
      setFormData({});
    }
    setShowModal(true);
  };

  const openConfigModal = (type, parentId = null) => {
    setSelectedType(type);
    setFormData({});
    setSelectedNode(parentId || sourceNode);
    setEditNodeId(null);
    setShowModal(true);
  };

  const handleSaveNode = () => {
    const label = `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Node`;
    const details =
      selectedType === "prompt"
        ? `Message: ${formData.message}`
        : selectedType === "key"
        ? `Options:\n${Object.entries(formData.options || {})
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")}`
        : selectedType === "transfer"
        ? `Transfer to: ${formData.destination}`
        : "Ends call";

    if (editNodeId) {
      setNodes((nds) => nds.map(n => n.id === editNodeId ? {
        ...n,
        data: { label, details, onDelete: deleteNode, onEdit: editNode }
      } : n));
      setShowModal(false);
      return;
    }

    const id = uuidv4();
    const parentNode = nodes.find(n => n.id === selectedNode);
    const position = parentNode
      ? { x: parentNode.position.x + 250, y: parentNode.position.y + 50 }
      : { x: 100 + nodes.length * 200, y: 100 + nodes.length * 80 };

    const newNode = {
      id,
      type: "ivrNode",
      position,
      data: { label, details, onDelete: deleteNode, onEdit: editNode },
    };

    const newEdge = { id: `${selectedNode}-${id}`, source: selectedNode, target: id, animated: true };
    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => addEdge(newEdge, eds));

    setTimeout(() => rfInstance && rfInstance.fitView(), 200);
    setShowModal(false);
  };

  return (
    <ReactFlowProvider>
      <div className="p-4 space-y-4 h-screen w-full">
        <div className="flex gap-2 mb-2">
          <Button variant="primary" onClick={() => openConfigModal("prompt")}>Add Prompt</Button>
          <Button variant="secondary" onClick={() => openConfigModal("key")}>Add Press-Key</Button>
          <Button variant="success" onClick={() => openConfigModal("transfer")}>Add Transfer</Button>
          <Button variant="danger" onClick={() => openConfigModal("hangup")}>Add Hangup</Button>
        </div>
        <div style={{ height: "80vh", width: "100%", border: "1px solid #ddd", borderRadius: 8 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSourceNode(node.id)}
            onNodeDoubleClick={(_, node) => {
              setSourceNode(node.id);
              openConfigModal("prompt", node.id);
            }}
            onInit={setRfInstance}
            fitView
          >
            <Background gap={20} color="#eee" />
            <MiniMap zoomable pannable />
            <Controls />
          </ReactFlow>
        </div>

        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Configure {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Node</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedType === "prompt" && (
              <Form.Group>
                <Form.Label>Message</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.message || ""}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </Form.Group>
            )}

            {selectedType === "key" && (
              <Form.Group>
                <Form.Label>Options (e.g. 1:Sales,2:Support)</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.raw || ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const optionsArr = raw.split(",").map(pair => pair.split(":"));
                    const options = Object.fromEntries(optionsArr);
                    setFormData({ ...formData, options, raw });
                  }}
                />
              </Form.Group>
            )}

            {selectedType === "transfer" && (
              <Form.Group>
                <Form.Label>Destination Extension</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.destination || ""}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                />
              </Form.Group>
            )}

            {selectedType === "hangup" && (
              <p className="text-sm text-muted">No configuration needed. This will end the call.</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveNode}>Save</Button>
          </Modal.Footer>
        </Modal>
      </div>
    </ReactFlowProvider>
  );
};

export default IVRBuilder;

