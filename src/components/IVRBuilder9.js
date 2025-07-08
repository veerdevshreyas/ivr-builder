// IVRBuilder – All-in-One Flow Builder with SaaS, REST API, AGI Export, and Multi-User Templates
import React, { useCallback, useState, useRef, useEffect } from "react";
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

// Local mode fallback
const API_BASE = "https://flow-builder-backend.onrender.com"; // set to null when API is not connected

const nodeTypes = {
  ivrNode: ({ id, data }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      style={{
        padding: 16,
        background: id === data.simNodeId ? "#e0f7fa" : "#ffffff",
        border: "2px solid #007bff",
        borderRadius: 16,
        width: 280,
        boxShadow: "0 6px 12px rgba(0,0,0,0.1)",
        fontFamily: "Inter, sans-serif",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <Handle type="target" position={Position.Top} id="a" style={{ background: '#007bff' }} />
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: '#555' }}>{data.name}</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: '#333' }}>{data.label}</div>
      <div style={{ fontSize: 13, color: '#444', marginBottom: 8 }}>{data.summary || "(Double-click to configure)"}</div>
      {data.audioUrl && (
        <audio controls src={data.audioUrl} style={{ width: "100%", marginBottom: 8 }} />
      )}
      {data.conditions && (
        <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>{data.conditions}</div>
      )}
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
  const [rfInstance, setRfInstance] = useState(null);
  const reactFlowWrapper = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [configData, setConfigData] = useState({ name: '', summary: '', conditions: '', blockType: '', audioUrl: '', apiMock: '' });
  const [simulationIndex, setSimulationIndex] = useState(null);
  const [userFlows, setUserFlows] = useState([]);

  const fetchFlows = async () => {
    if (!API_BASE) return;
    try {
      const res = await import("axios").then(ax => ax.default.get(`${API_BASE}/flows?user=${props.user.username}`));
      setUserFlows(res.data);
    } catch (err) {
      console.warn("Fetch error:", err.message);
    }
  };

  const saveFlow = async () => {
    if (!API_BASE) {
      console.log("Saved flow:", { nodes, edges });
      alert("Flow mock-saved (no backend)");
      return;
    }
    try {
      const axios = await import("axios").then(ax => ax.default);
      const payload = { name: "Untitled Flow", nodes, edges };
      await axios.post(`${API_BASE}/flows`, payload);
      alert("Flow saved!");
    } catch (err) {
      console.warn("Save error:", err.message);
    }
  };

  const exportAGI = async () => {
    if (!API_BASE) {
      const script = `; AGI Script\n; Nodes: ${nodes.length}, Edges: ${edges.length}`;
      const blob = new Blob([script], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ivr-flow.agi';
      a.click();
      return;
    }
    try {
      const axios = await import("axios").then(ax => ax.default);
      const response = await axios.post(`${API_BASE}/export/agi`, { nodes, edges });
      const blob = new Blob([response.data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ivr-flow.agi';
      a.click();
    } catch (err) {
      console.warn("Export error:", err.message);
    }
  };

  const onDragStart = (event, type) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const type = event.dataTransfer.getData("application/reactflow");
    if (!rfInstance) return;
    const position = rfInstance.project({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    });
    const id = uuidv4();
    const newNode = {
      id,
      type: "ivrNode",
      position,
      data: {
        name: `${type}-${nodes.length + 1}`,
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
        blockType: type,
        onDelete: (id) => deleteNode(id),
        onConfigure: () => openModal(id),
      }
    };
    setNodes((nds) => nds.concat(newNode));
  }, [rfInstance, nodes]);

  const deleteNode = (id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const openModal = (id) => {
    const node = nodes.find(n => n.id === id);
    if (node) {
      setEditingNode(id);
      setConfigData({
        name: node.data.name || '',
        summary: node.data.summary || '',
        conditions: node.data.conditions || '',
        blockType: node.data.blockType || '',
        audioUrl: node.data.audioUrl || '',
        apiMock: node.data.apiMock || ''
      });
      setShowModal(true);
    }
  };

  const handleSaveConfig = () => {
    setNodes(nds => nds.map(n =>
      n.id === editingNode ? {
        ...n,
        data: {
          ...n.data,
          ...configData
        }
      } : n
    ));
    setShowModal(false);
  };

  useEffect(() => { fetchFlows(); }, []);
const handleImportJSON = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      } catch (err) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  }
};
  return (
    <ReactFlowProvider>
      <div style={{ display: "flex", height: "100vh" }}>
        <aside style={{ width: 260, padding: 16, background: "#f8f9fb", borderRight: "1px solid #e0e0e0" }}>
          <h4>IVR Blocks</h4>
          {["prompt", "key", "transfer", "hangup", "api", "record", "language", "menu", "queue", "voicemail"].map(type => (
            <div key={type} onDragStart={(e) => onDragStart(e, type)} draggable style={{ padding: 10, marginBottom: 10, border: "1px solid #cfe2ff", borderRadius: 8, background: "#fff" }}>{type}</div>
          ))}
          <hr />
          <Button size="sm" onClick={saveFlow}>💾 Save</Button>{' '}
          <input type="file" accept=".json" onChange={handleImportJSON} />

          <Button size="sm" onClick={exportAGI}>📜 Export AGI</Button>
        </aside>
        <div ref={reactFlowWrapper} style={{ flexGrow: 1 }}>
          <ReactFlow
            nodes={nodes.map(n => ({ ...n, data: { ...n.data, onDelete: deleteNode, onConfigure: () => openModal(n.id), simNodeId: simulationIndex } }))}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={(params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds))}
            onInit={setRfInstance}
            nodeTypes={nodeTypes}
            onDrop={onDrop}
            onDragOver={(event) => event.preventDefault()}
            onEdgeClick={(event, edge) => {
              event.stopPropagation();
              setEdges((eds) => eds.filter((e) => e.id !== edge.id));
            }}
            onNodeDoubleClick={(_, node) => openModal(node.id)}
            fitView
          >
            <Background gap={20} color="#f0f0f0" />
            <MiniMap nodeColor={() => '#007bff'} nodeStrokeWidth={2} />
            <Controls showInteractive={true} />
          </ReactFlow>
        </div>

        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Configure Node</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Node Name</Form.Label>
              <Form.Control type="text" value={configData.name} onChange={(e) => setConfigData({ ...configData, name: e.target.value })} />
            </Form.Group>
            <Form.Group className="mt-2">
              <Form.Label>Details / Summary</Form.Label>
              <Form.Control as="textarea" rows={3} value={configData.summary} onChange={(e) => setConfigData({ ...configData, summary: e.target.value })} />
            </Form.Group>
            <Form.Group className="mt-2">
              <Form.Label>Audio File URL (optional)</Form.Label>
              <Form.Control type="text" value={configData.audioUrl} onChange={(e) => setConfigData({ ...configData, audioUrl: e.target.value })} />
            </Form.Group>
            <Form.Group className="mt-2">
              <Form.Label>Conditional Routing</Form.Label>
              <Form.Control as="textarea" rows={3} value={configData.conditions} onChange={(e) => setConfigData({ ...configData, conditions: e.target.value })} />
            </Form.Group>
            {configData.blockType === 'api' && (
              <Form.Group className="mt-2">
                <Form.Label>Mock API Response</Form.Label>
                <Form.Control as="textarea" rows={2} value={configData.apiMock} onChange={(e) => setConfigData({ ...configData, apiMock: e.target.value })} />
              </Form.Group>
            )}
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
