// IVRBuilder – Multi-user Flow Builder
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

const API_BASE = "http://localhost:5000"; // Backend URL

const nodeTypes = {
  ivrNode: ({ id, data }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      style={{
        padding: 16,
        background: id === data.simNodeId ? "#e0f7fa" : "#fff",
        border: "2px solid #007bff",
        borderRadius: 16,
        width: 280,
        boxShadow: "0 6px 12px rgba(0,0,0,0.1)",
        fontFamily: "Inter, sans-serif",
        position: "relative"
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#007bff' }} />
      <div style={{ fontWeight: 700, fontSize: 14 }}>{data.name}</div>
      <div style={{ fontWeight: 600 }}>{data.label}</div>
      <div style={{ fontSize: 12 }}>{data.summary || "(Double-click to configure)"}</div>
      {data.audioUrl && <audio controls src={data.audioUrl} style={{ width: "100%" }} />}
      <Handle type="source" position={Position.Bottom} style={{ background: '#007bff' }} />
      <button
        onClick={(e) => {
          e.stopPropagation();
          data.onDelete(id);
        }}
        style={{
          position: 'absolute', top: 6, right: 6,
          background: '#ff6b6b', color: '#fff', border: 'none',
          borderRadius: '50%', width: 24, height: 24
        }}
        title="Delete"
      >×</button>
    </motion.div>
  )
};

const IVRBuilder = ({ user }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rfInstance, setRfInstance] = useState(null);
  const reactFlowWrapper = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [configData, setConfigData] = useState({});
  const [userFlows, setUserFlows] = useState([]);
  const [selectedFlowId, setSelectedFlowId] = useState("");

  // Load saved flows for current user
  const fetchFlows = async () => {
    if (!user || !API_BASE) return;
    try {
      const axios = await import("axios").then(ax => ax.default);
      const res = await axios.get(`${API_BASE}/flows?user=${user}`);
      setUserFlows(res.data);
    } catch (err) {
      console.error("Fetch error:", err.message);
    }
  };

  // Save current flow
  const saveFlow = async () => {
    if (!API_BASE) {
      alert("Flow saved locally (mock)");
      return;
    }
    try {
      const axios = await import("axios").then(ax => ax.default);
      const payload = {
        name: `Flow-${new Date().toISOString()}`,
        username: user,
        nodes, edges
      };
      await axios.post(`${API_BASE}/flows`, payload);
      alert("Flow saved successfully!");
      fetchFlows(); // Refresh list
    } catch (err) {
      console.warn("Save error:", err.message);
    }
  };

  // Load selected flow
  const loadFlow = (flow) => {
    setNodes(flow.nodes || []);
    setEdges(flow.edges || []);
  };

  // AGI Export
  const exportAGI = async () => {
    try {
      const axios = await import("axios").then(ax => ax.default);
      const res = await axios.post(`${API_BASE}/export/agi`, { nodes, edges });
      const blob = new Blob([res.data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ivr-flow.agi";
      a.click();
    } catch (err) {
      alert("Export failed");
    }
  };

  // Drag handlers
  const onDragStart = (e, type) => {
    e.dataTransfer.setData("application/reactflow", type);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = useCallback((e) => {
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const type = e.dataTransfer.getData("application/reactflow");
    const position = rfInstance.project({
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top
    });
    const id = uuidv4();
    const newNode = {
      id,
      type: "ivrNode",
      position,
      data: {
        name: `${type}-${nodes.length + 1}`,
        label: `${type} Node`,
        blockType: type,
        onDelete: (id) => deleteNode(id),
        onConfigure: () => openModal(id),
      }
    };
    setNodes(nds => [...nds, newNode]);
  }, [rfInstance, nodes]);

  const deleteNode = (id) => {
    setNodes((nds) => nds.filter(n => n.id !== id));
    setEdges((eds) => eds.filter(e => e.source !== id && e.target !== id));
  };

  const openModal = (id) => {
    const node = nodes.find(n => n.id === id);
    if (node) {
      setEditingNode(id);
      setConfigData({
        name: node.data.name || "",
        summary: node.data.summary || "",
        audioUrl: node.data.audioUrl || "",
        conditions: node.data.conditions || "",
        apiMock: node.data.apiMock || "",
        blockType: node.data.blockType
      });
      setShowModal(true);
    }
  };

  const handleSaveConfig = () => {
    setNodes(nds => nds.map(n => n.id === editingNode ? { ...n, data: { ...n.data, ...configData } } : n));
    setShowModal(false);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        setNodes(json.nodes || []);
        setEdges(json.edges || []);
      } catch {
        alert("Invalid JSON");
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    fetchFlows();
  }, [user]);

  return (
    <ReactFlowProvider>
      <div style={{ display: "flex", height: "100vh" }}>
        <aside style={{ width: 260, padding: 16, background: "#f4f6fa", borderRight: "1px solid #ddd" }}>
          <h4>IVR Blocks</h4>
          {["prompt", "key", "transfer", "hangup", "api", "record", "language"].map(type => (
            <div key={type} draggable onDragStart={(e) => onDragStart(e, type)}
              style={{ margin: "8px 0", padding: 8, border: "1px solid #ccc", borderRadius: 6, background: "#fff", cursor: "grab" }}>
              {type}
            </div>
          ))}
          <hr />
          <Button size="sm" onClick={saveFlow}>💾 Save Flow</Button>
          <Button size="sm" className="mt-2" onClick={exportAGI}>📜 Export AGI</Button>
          <input className="mt-2" type="file" accept=".json" onChange={handleImportJSON} />

          {userFlows.length > 0 && (
            <>
              <hr />
              <Form.Select size="sm" value={selectedFlowId} onChange={(e) => {
                const flow = userFlows.find(f => f._id === e.target.value);
                setSelectedFlowId(e.target.value);
                if (flow) loadFlow(flow);
              }}>
                <option>Load your flows</option>
                {userFlows.map(f => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </Form.Select>
            </>
          )}
        </aside>
        <div ref={reactFlowWrapper} style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes.map(n => ({ ...n, data: { ...n.data, onDelete: deleteNode, onConfigure: () => openModal(n.id) } }))}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={(params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds))}
            onInit={setRfInstance}
            nodeTypes={nodeTypes}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onNodeDoubleClick={(_, node) => openModal(node.id)}
            fitView
          >
            <Background />
            <MiniMap nodeColor={() => "#007bff"} />
            <Controls />
          </ReactFlow>
        </div>

        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton><Modal.Title>Configure Node</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group><Form.Label>Name</Form.Label><Form.Control value={configData.name} onChange={(e) => setConfigData({ ...configData, name: e.target.value })} /></Form.Group>
            <Form.Group className="mt-2"><Form.Label>Summary</Form.Label><Form.Control as="textarea" value={configData.summary} onChange={(e) => setConfigData({ ...configData, summary: e.target.value })} /></Form.Group>
            <Form.Group className="mt-2"><Form.Label>Audio URL</Form.Label><Form.Control value={configData.audioUrl} onChange={(e) => setConfigData({ ...configData, audioUrl: e.target.value })} /></Form.Group>
            <Form.Group className="mt-2"><Form.Label>Conditions</Form.Label><Form.Control as="textarea" value={configData.conditions} onChange={(e) => setConfigData({ ...configData, conditions: e.target.value })} /></Form.Group>
            {configData.blockType === "api" && (
              <Form.Group className="mt-2"><Form.Label>Mock API</Form.Label><Form.Control as="textarea" value={configData.apiMock} onChange={(e) => setConfigData({ ...configData, apiMock: e.target.value })} /></Form.Group>
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

