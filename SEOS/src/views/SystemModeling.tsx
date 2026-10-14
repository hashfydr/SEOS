import { useState, useEffect, useRef, useCallback } from 'react';
import type { UMLNode } from '../types';
import { useStore } from '../store';

const NODE_WIDTH = 240;
const HEADER_HEIGHT = 40;
const FIELD_HEIGHT = 28;

const calculateEdgePath = (sourceNode: UMLNode, targetNode: UMLNode) => {
  const sx = sourceNode.x + NODE_WIDTH;
  const sy = sourceNode.y + HEADER_HEIGHT + (sourceNode.fields.length * FIELD_HEIGHT) / 2;
  const tx = targetNode.x;
  const ty = targetNode.y + HEADER_HEIGHT + (targetNode.fields.length * FIELD_HEIGHT) / 2;
  
  if (Math.abs(sourceNode.x - targetNode.x) < NODE_WIDTH) {
    const cx = sourceNode.x + NODE_WIDTH / 2;
    const nodeBottom = sourceNode.y + HEADER_HEIGHT + sourceNode.fields.length * FIELD_HEIGHT + (sourceNode.methods?.length || 0) * 20 + 16;
    const midY = (nodeBottom + targetNode.y) / 2;
    return `M ${cx} ${nodeBottom} C ${cx} ${midY}, ${targetNode.x + NODE_WIDTH / 2} ${midY}, ${targetNode.x + NODE_WIDTH / 2} ${targetNode.y}`;
  }
  
  const cpx1 = sx + (tx - sx) * 0.4;
  const cpx2 = tx - (tx - sx) * 0.4;
  return `M ${sx} ${sy} C ${cpx1} ${sy}, ${cpx2} ${ty}, ${tx} ${ty}`;
};

export default function SystemModeling() {
  const storeNodes = useStore((s) => s.umlNodes);
  const storeEdges = useStore((s) => s.umlEdges);
  
  const [nodes, setNodes] = useState<UMLNode[]>(storeNodes);
  const [edges, setEdges] = useState(storeEdges);
  
  useEffect(() => {
    if (storeNodes && storeNodes.length > 0) {
      setNodes(storeNodes);
    }
  }, [storeNodes]);

  useEffect(() => {
    if (storeEdges) {
      setEdges(storeEdges);
    }
  }, [storeEdges]);
  
  // History State for Undo/Redo
  const [history, setHistory] = useState<{ nodes: UMLNode[], edges: any[] }[]>([{ nodes: storeNodes, edges: storeEdges }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  const saveState = useCallback((newNodes: UMLNode[], newEdges: any[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ nodes: newNodes, edges: newEdges });
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(prev => prev - 1);
      showSyncToast('Undo');
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(prev => prev + 1);
      showSyncToast('Redo');
    }
  }, [history, historyIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const [zoom, setZoom] = useState(1);
  const [isLocked, setIsLocked] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [syncToast, setSyncToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  
  const [draggingNode, setDraggingNode] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; nodeId: string | null }>({ visible: false, x: 0, y: 0, nodeId: null });
  const [editingFieldsNode, setEditingFieldsNode] = useState<UMLNode | null>(null);
  
  const [editingNodeName, setEditingNodeName] = useState<{ id: string; name: string } | null>(null);
  const [connectingSourceNodeId, setConnectingSourceNodeId] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  const showSyncToast = (message: string) => {
    setSyncToast({ visible: true, message });
    setTimeout(() => {
      setSyncToast({ visible: false, message: '' });
    }, 2000);
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (isLocked) return;
    e.stopPropagation();
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    
    // const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    // Calculate offset relative to the node's top-left corner, considering zoom
    const offsetX = (e.clientX - canvasRect.left) / zoom - node.x;
    const offsetY = (e.clientY - canvasRect.top) / zoom - node.y;
    
    setDraggingNode({ id, offsetX, offsetY });
    setSelectedNodeId(id);
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingNode || isLocked) return;
    
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const newX = (e.clientX - canvasRect.left) / zoom - draggingNode.offsetX;
    const newY = (e.clientY - canvasRect.top) / zoom - draggingNode.offsetY;

    setNodes(prev => prev.map(n => n.id === draggingNode.id ? { ...n, x: newX, y: newY } : n));
  }, [draggingNode, isLocked, zoom]);

  const handleMouseUp = useCallback(() => {
    if (draggingNode) {
      setDraggingNode(null);
      saveState(nodesRef.current, edgesRef.current);
      showSyncToast('Node position saved');
    }
  }, [draggingNode, saveState]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const addNode = () => {
    const newNode: UMLNode = {
      id: `entity-${Date.now()}`,
      name: 'NewEntity',
      type: 'entity',
      x: 300 / zoom,
      y: 300 / zoom,
      fields: [
        { name: 'id', type: 'UUID', isPK: true },
        { name: 'name', type: 'VARCHAR' }
      ]
    };
    saveState([...nodes, newNode], edges);
    showSyncToast('Node added');
  };

  const deleteNode = (id: string) => {
    saveState(nodes.filter(n => n.id !== id), edges.filter(e => e.from !== id && e.to !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    showSyncToast('Node deleted');
  };
  
  const duplicateNode = (id: string) => {
    const nodeToClone = nodes.find(n => n.id === id);
    if (!nodeToClone) return;
    const newNode = {
      ...nodeToClone,
      id: `entity-${Date.now()}`,
      x: nodeToClone.x + 40,
      y: nodeToClone.y + 40,
    };
    saveState([...nodes, newNode], edges);
    showSyncToast('Node duplicated');
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      nodeId: id
    });
    setSelectedNodeId(id);
  };

  const closeContextMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };
  
  const handleNameDoubleClick = (node: UMLNode) => {
    setEditingNodeName({ id: node.id, name: node.name });
  };
  
  const handleNameSave = () => {
    if (editingNodeName) {
      saveState(nodes.map(n => n.id === editingNodeName.id ? { ...n, name: editingNodeName.name } : n), edges);
      setEditingNodeName(null);
      showSyncToast('Node renamed');
    }
  };

  const getHeaderColor = (type: string) => {
    switch (type) {
      case 'entity': return 'bg-seos-accent';
      case 'actor': return 'bg-seos-green';
      case 'service': return 'bg-cyan-600';
      default: return 'bg-seos-accent';
    }
  };

  const visibleEdges = edges.filter(e => nodes.some(n => n.id === e.from) && nodes.some(n => n.id === e.to));

  return (
    <div className="relative w-full h-full bg-seos-bg overflow-hidden flex flex-col font-sans" onClick={() => { setSelectedNodeId(null); closeContextMenu(); }}>
      {/* Toast */}
      {syncToast.visible && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-seos-green text-black px-4 py-2 rounded shadow-lg animate-fade-in-down font-medium shadow-seos-green-glow">
          {syncToast.message}
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 overflow-auto relative custom-scrollbar">
        <div 
          ref={canvasRef}
          className="absolute inset-0 origin-top-left" 
          style={{ transform: `scale(${zoom})`, minWidth: '2000px', minHeight: '2000px', backgroundImage: 'radial-gradient(circle, var(--seos-border) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        >
          {/* Edges SVG Layer */}
          <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
            {visibleEdges.map(edge => {
              const sourceNode = nodes.find(n => n.id === edge.from);
              const targetNode = nodes.find(n => n.id === edge.to);
              if (!sourceNode || !targetNode) return null;
              const pathData = calculateEdgePath(sourceNode, targetNode);
              return (
                <path 
                  key={edge.id}
                  d={pathData}
                  fill="none"
                  stroke="var(--app-border-2)"
                  strokeWidth="3"
                  markerEnd="url(#arrowhead)"
                  className="opacity-60 transition-all duration-200 hover:stroke-seos-red hover:opacity-100 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    saveState(nodes, edges.filter(e2 => e2.id !== edge.id));
                    showSyncToast('Connection removed');
                  }}
                  />
              );
            })}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--app-border-2)" />
              </marker>
            </defs>
          </svg>

          {/* Nodes */}
          {nodes.map(node => (
            <div
              key={node.id}
              className={`absolute flex flex-col bg-seos-surface border ${selectedNodeId === node.id || connectingSourceNodeId === node.id ? 'ring-2 ring-seos-accent border-seos-accent shadow-seos-accent-glow' : 'border-seos-border'} rounded-md text-seos-text text-sm transition-shadow duration-200 ${draggingNode?.id === node.id ? 'z-50 shadow-2xl opacity-95 scale-[1.01]' : 'z-10 shadow-lg'}`}
              style={{ left: node.x, top: node.y, width: NODE_WIDTH }}
              onClick={(e) => { 
                e.stopPropagation(); 
                if (connectingSourceNodeId) {
                  if (connectingSourceNodeId !== node.id) {
                    saveState(nodes, [...edges, { id: `edge-${Date.now()}`, from: connectingSourceNodeId, to: node.id }]);
                    showSyncToast('Nodes connected');
                  }
                  setConnectingSourceNodeId(null);
                } else {
                  setSelectedNodeId(node.id); 
                  closeContextMenu(); 
                }
              }}
              onContextMenu={(e) => handleContextMenu(e, node.id)}
            >
              {selectedNodeId === node.id && (
                <button 
                  className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 rounded-full text-white flex items-center justify-center hover:bg-red-600 shadow-md z-10"
                  onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                >
                  ✕
                </button>
              )}
              
              <div 
                className={`${getHeaderColor(node.type)} px-3 py-2 flex items-center justify-between rounded-t-md ${!isLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={{ height: HEADER_HEIGHT }}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onDoubleClick={() => handleNameDoubleClick(node)}
              >
                {editingNodeName?.id === node.id ? (
                  <input 
                    type="text" 
                    className="bg-black/20 text-white w-full px-1 outline-none rounded"
                    value={editingNodeName.name}
                    autoFocus
                    onChange={(e) => setEditingNodeName({ ...editingNodeName, name: e.target.value })}
                    onBlur={handleNameSave}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); }}
                  />
                ) : (
                  <span className="font-semibold text-white tracking-wide truncate">{node.name}</span>
                )}
                <span className="text-xs text-white/70 uppercase font-bold tracking-wider">{node.type}</span>
              </div>
              
              <div className="flex flex-col py-1">
                {node.fields.map((field, i) => (
                  <div key={i} className="flex justify-between items-center px-3 hover:bg-seos-surface-2 transition-colors" style={{ height: FIELD_HEIGHT }}>
                    <div className="flex items-center gap-1.5 truncate">
                      {field.isPK && <span className="text-xs font-bold text-seos-amber" title="Primary Key">PK</span>}
                      {field.isFK && <span className="text-xs font-bold text-seos-cyan" title="Foreign Key">FK</span>}
                      <span className="truncate">{field.name}</span>
                    </div>
                    <span className="text-xs text-seos-text-3 font-mono">{field.type}</span>
                  </div>
                ))}
              </div>
              
              {node.methods && node.methods.length > 0 && (
                <div className="border-t border-seos-border-2 py-1 bg-seos-surface-2/30 rounded-b-md">
                  {node.methods.map((method, i) => (
                    <div key={i} className="px-3 py-0.5 text-xs text-seos-text-2 font-mono flex gap-1">
                      <span className="text-seos-green">+</span>
                      <span>{method}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Toolbox */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2 p-2 bg-seos-surface/80 backdrop-blur-md border border-seos-border-2 rounded-full shadow-2xl z-40">
        <button onClick={addNode} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-seos-surface-3 text-seos-text transition-colors" title="Add Node">
          ＋
        </button>
        <div className="w-px h-6 bg-seos-border-2 mx-1"></div>
        <button onClick={() => setZoom(Math.min(zoom + 0.1, 1.5))} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-seos-surface-3 text-seos-text transition-colors" title="Zoom In">
          ⊕
        </button>
        <button onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-seos-surface-3 text-seos-text transition-colors" title="Zoom Out">
          ⊖
        </button>
        <button onClick={() => setZoom(1)} className="px-3 h-10 rounded-full flex items-center justify-center hover:bg-seos-surface-3 text-seos-text text-sm font-medium transition-colors" title="Fit View">
          1:1
        </button>
        <div className="w-px h-6 bg-seos-border-2 mx-1"></div>
        <button onClick={() => setIsLocked(!isLocked)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isLocked ? 'bg-seos-accent/20 text-seos-accent' : 'hover:bg-seos-surface-3 text-seos-text'}`} title="Toggle Lock">
          {isLocked ? '🔒' : '🔓'}
        </button>
        <div className="w-px h-6 bg-seos-border-2 mx-1"></div>
        <div className="relative group flex items-center justify-center w-10 h-10">
          <button className="w-6 h-6 rounded-full flex items-center justify-center text-seos-text-3 hover:text-seos-text hover:bg-seos-surface-3 transition-colors text-xs font-bold border border-seos-border">
            ?
          </button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-seos-surface-2 border border-seos-border shadow-xl rounded-lg text-xs text-seos-text hidden group-hover:block z-50 pointer-events-none">
            <p className="font-semibold text-seos-text mb-1">Why is this draggable?</p>
            <p className="text-seos-text-2">Dragging allows you to manually organize your system architecture. Group related microservices or tables together visually for better readability and mental mapping, rather than relying on strict auto-layouts.</p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-seos-surface-2"></div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          className="fixed z-50 bg-seos-surface-2 border border-seos-border shadow-xl rounded-md py-1 min-w-[160px] text-sm flex flex-col"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button className="px-4 py-2 text-left hover:bg-seos-surface-3 text-seos-text w-full transition-colors" onClick={() => { setEditingFieldsNode(nodes.find(n => n.id === contextMenu.nodeId) || null); closeContextMenu(); }}>Edit Fields</button>
          <button className="px-4 py-2 text-left hover:bg-seos-surface-3 text-seos-text w-full transition-colors" onClick={() => {
            saveState(nodes.map(n => n.id === contextMenu.nodeId ? { ...n, methods: [...(n.methods || []), 'newMethod()'] } : n), edges);
            closeContextMenu();
            showSyncToast('Method added');
          }}>Add Method</button>
          <button className="px-4 py-2 text-left hover:bg-seos-surface-3 text-seos-text w-full transition-colors" onClick={() => { duplicateNode(contextMenu.nodeId!); closeContextMenu(); }}>Duplicate</button>
          <button className="px-4 py-2 text-left hover:bg-seos-surface-3 text-seos-text w-full transition-colors" onClick={() => { setConnectingSourceNodeId(contextMenu.nodeId); closeContextMenu(); showSyncToast('Click another node to connect'); }}>Connect to...</button>
          <button className="px-4 py-2 text-left hover:bg-seos-surface-3 text-seos-text w-full transition-colors" onClick={() => {
            const types = ['entity', 'actor', 'service'] as const;
            saveState(nodes.map(n => n.id === contextMenu.nodeId ? { ...n, type: types[(types.indexOf(n.type as any) + 1) % types.length] } : n), edges);
            closeContextMenu();
          }}>Change Type/Color</button>
          <div className="h-px bg-seos-border my-1"></div>
          <button className="px-4 py-2 text-left hover:bg-red-500/20 text-seos-red w-full transition-colors" onClick={() => { deleteNode(contextMenu.nodeId!); closeContextMenu(); }}>Delete</button>
        </div>
      )}

      {/* Edit Fields Modal */}
      {editingFieldsNode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-seos-surface border border-seos-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[80vh]">
            <div className="px-5 py-4 border-b border-seos-border-2 flex justify-between items-center bg-seos-surface-2/50">
              <h2 className="text-lg font-semibold text-seos-text">Edit Fields - {editingFieldsNode.name}</h2>
              <button onClick={() => setEditingFieldsNode(null)} className="text-seos-text-3 hover:text-seos-text transition-colors">✕</button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-3">
              {editingFieldsNode.fields.map((field, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-seos-surface-2 p-2 rounded border border-seos-border-2">
                  <input 
                    type="text" 
                    value={field.name} 
                    onChange={(e) => {
                      const newFields = [...editingFieldsNode.fields];
                      newFields[idx].name = e.target.value;
                      setEditingFieldsNode({ ...editingFieldsNode, fields: newFields });
                    }}
                    className="flex-1 bg-seos-bg border border-seos-border rounded px-2 py-1 text-sm text-seos-text focus:outline-none focus:border-seos-accent"
                    placeholder="Field name"
                  />
                  <select 
                    value={field.type}
                    onChange={(e) => {
                      const newFields = [...editingFieldsNode.fields];
                      newFields[idx].type = e.target.value;
                      setEditingFieldsNode({ ...editingFieldsNode, fields: newFields });
                    }}
                    className="w-32 bg-seos-bg border border-seos-border rounded px-2 py-1 text-sm text-seos-text focus:outline-none focus:border-seos-accent"
                  >
                    {['VARCHAR', 'UUID', 'INT', 'FLOAT', 'BOOLEAN', 'TIMESTAMP', 'TEXT', 'ENUM', 'DECIMAL'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-seos-text-2 cursor-pointer">
                    <input type="checkbox" checked={!!field.isPK} onChange={(e) => {
                      const newFields = [...editingFieldsNode.fields];
                      newFields[idx].isPK = e.target.checked;
                      setEditingFieldsNode({ ...editingFieldsNode, fields: newFields });
                    }} /> PK
                  </label>
                  <label className="flex items-center gap-1 text-xs text-seos-text-2 cursor-pointer">
                    <input type="checkbox" checked={!!field.isFK} onChange={(e) => {
                      const newFields = [...editingFieldsNode.fields];
                      newFields[idx].isFK = e.target.checked;
                      setEditingFieldsNode({ ...editingFieldsNode, fields: newFields });
                    }} /> FK
                  </label>
                  <button 
                    onClick={() => {
                      const newFields = editingFieldsNode.fields.filter((_, i) => i !== idx);
                      setEditingFieldsNode({ ...editingFieldsNode, fields: newFields });
                    }}
                    className="text-seos-red hover:text-red-300 ml-1 p-1"
                  >✕</button>
                </div>
              ))}
              
              <button 
                onClick={() => setEditingFieldsNode({
                  ...editingFieldsNode, 
                  fields: [...editingFieldsNode.fields, { name: 'new_field', type: 'VARCHAR' }]
                })}
                className="mt-2 py-2 border border-dashed border-seos-border-2 rounded text-seos-text-2 hover:text-seos-text hover:border-seos-border transition-colors text-sm"
              >
                + Add Field
              </button>
            </div>
            
            
            {/* Methods Section */}
            <div className="px-5 py-3 border-t border-seos-border-2 bg-seos-surface-2/30">
              <h3 className="text-sm font-semibold text-seos-text mb-2">Methods</h3>
              <div className="flex flex-col gap-2">
                {(editingFieldsNode.methods || []).map((method, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-seos-surface-2 p-2 rounded border border-seos-border-2">
                    <span className="text-seos-green text-sm">+</span>
                    <input 
                      type="text" 
                      value={method} 
                      onChange={(e) => {
                        const newMethods = [...(editingFieldsNode.methods || [])];
                        newMethods[idx] = e.target.value;
                        setEditingFieldsNode({ ...editingFieldsNode, methods: newMethods });
                      }}
                      className="flex-1 bg-seos-bg border border-seos-border rounded px-2 py-1 text-sm text-seos-text focus:outline-none focus:border-seos-accent font-mono"
                      placeholder="methodName()"
                    />
                    <button 
                      onClick={() => {
                        const newMethods = (editingFieldsNode.methods || []).filter((_, i) => i !== idx);
                        setEditingFieldsNode({ ...editingFieldsNode, methods: newMethods });
                      }}
                      className="text-seos-red hover:text-red-300 ml-1 p-1"
                    >✕</button>
                  </div>
                ))}
                <button 
                  onClick={() => setEditingFieldsNode({
                    ...editingFieldsNode, 
                    methods: [...(editingFieldsNode.methods || []), 'newMethod()']
                  })}
                  className="mt-1 py-1.5 border border-dashed border-seos-border-2 rounded text-seos-text-2 hover:text-seos-text hover:border-seos-border transition-colors text-sm"
                >
                  + Add Method
                </button>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-seos-border-2 flex justify-end gap-3 bg-seos-surface-2/50">
              <button 
                onClick={() => setEditingFieldsNode(null)}
                className="px-4 py-2 rounded text-seos-text hover:bg-seos-surface-3 transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  saveState(nodes.map(n => n.id === editingFieldsNode.id ? editingFieldsNode : n), edges);
                  setEditingFieldsNode(null);
                  showSyncToast('Fields updated');
                }}
                className="px-4 py-2 rounded bg-seos-accent text-white hover:bg-seos-accent/90 shadow-md shadow-seos-accent/20 transition-all text-sm font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
