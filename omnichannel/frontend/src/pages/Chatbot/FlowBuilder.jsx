import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
    ReactFlowProvider,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Plus, Save, Trash2, Play, Square, ArrowLeft, Settings,
    MessageSquare, Bot, Clock, Filter, Send, Zap, Database, CheckCircle, X, Image, Globe
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReactFlow } from 'reactflow';

const uuidv4 = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36));

// Custom Node Wrapper for Deletion
function NodeWrapper({ id, type, children }) {
    const { setNodes, setEdges } = useReactFlow();
    const onDelete = (e) => {
        e.stopPropagation();
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    };
    return (
        <div className="relative group">
            {type !== 'start' && (
                <button
                    onClick={onDelete}
                    className="nodrag absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-red-600 shadow-sm"
                    title="Remove Node"
                >
                    <X className="w-3 h-3" />
                </button>
            )}
            {children}
        </div>
    );
}

// Custom Node Components
function StartNode({ id, data }) {
    return (
        <NodeWrapper id={id} type="start">
            <div className="px-4 py-3 bg-green-500 text-white rounded-lg shadow-lg min-w-[150px]">
                <Handle type="target" position={Position.Top} className="w-3 h-3 bg-green-700 border-2 border-white rounded-full" />
                <div className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    <span className="font-bold text-sm">Start</span>
                </div>
                <p className="text-xs text-green-100 mt-1">{data.label || 'Trigger Flow'}</p>
            </div>
        </NodeWrapper>
    );
}

function MessageNode({ id, data, selected }) {
    return (
        <NodeWrapper id={id} type="message">
            <div className={`px-4 py-3 bg-white rounded-lg shadow-lg border-2 min-w-[200px] ${selected ? 'border-indigo-500' : 'border-gray-200'}`}>
                <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400 border-2 border-white rounded-full" />
                <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    <span className="font-bold text-sm text-gray-700">Send Message</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{data.message || 'Enter message...'}</p>
                <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-indigo-500 border-2 border-white rounded-full" />
            </div>
        </NodeWrapper>
    );
}

function QuestionNode({ id, data, selected }) {
    return (
        <NodeWrapper id={id} type="question">
            <div className={`px-4 py-3 bg-purple-50 rounded-lg border-2 shadow-lg min-w-[200px] ${selected ? 'border-purple-500' : 'border-purple-200'}`}>
                <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400 border-2 border-white rounded-full" />
                <div className="flex items-center gap-2 mb-2">
                    <Filter className="w-4 h-4 text-purple-500" />
                    <span className="font-bold text-sm text-purple-700">Ask Question</span>
                </div>
                <p className="text-xs text-purple-600 line-clamp-2">{data.question || 'Ask something...'}</p>
                <div className="mt-2 text-xs text-gray-500">Save answer to: {data.variable || 'answer'}</div>
                <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500 border-2 border-white rounded-full" />
            </div>
        </NodeWrapper>
    );
}

function ActionNode({ id, data, selected }) {
    return (
        <NodeWrapper id={id} type="action">
            <div className={`px-4 py-3 bg-orange-50 rounded-lg border-2 shadow-lg min-w-[180px] ${selected ? 'border-orange-500' : 'border-orange-200'}`}>
                <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400 border-2 border-white rounded-full" />
                <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span className="font-bold text-sm text-orange-700">{data.actionType || 'Action'}</span>
                </div>
                <p className="text-xs text-orange-600">{data.description || 'Perform action'}</p>
                <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-orange-500 border-2 border-white rounded-full" />
            </div>
        </NodeWrapper>
    );
}

function ConditionNode({ id, data, selected }) {
    return (
        <NodeWrapper id={id} type="condition">
            <div className={`px-4 py-3 bg-yellow-50 rounded-lg border-2 shadow-lg min-w-[180px] ${selected ? 'border-yellow-500' : 'border-yellow-200'}`}>
                <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400 border-2 border-white rounded-full" />
                <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-4 h-4 text-yellow-600" />
                    <span className="font-bold text-sm text-yellow-700">Condition</span>
                </div>
                <p className="text-xs text-yellow-600">{data.condition || 'If/Else condition'}</p>
                <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Yes</span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">No</span>
                </div>
                <Handle id="yes" type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500 border-2 border-white rounded-full" style={{ left: '30%' }} />
                <Handle id="no" type="source" position={Position.Bottom} className="w-3 h-3 bg-red-500 border-2 border-white rounded-full" style={{ left: '70%' }} />
            </div>
        </NodeWrapper>
    );
}

function DelayNode({ id, data, selected }) {
    return (
        <NodeWrapper id={id} type="delay">
            <div className={`px-4 py-3 bg-gray-50 rounded-lg border-2 shadow-lg min-w-[150px] ${selected ? 'border-gray-500' : 'border-gray-200'}`}>
                <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400 border-2 border-white rounded-full" />
                <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="font-bold text-sm text-gray-700">Delay</span>
                </div>
                <p className="text-sm font-medium text-gray-600">{data.duration || '5'} {data.unit || 'seconds'}</p>
                <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-500 border-2 border-white rounded-full" />
            </div>
        </NodeWrapper>
    );
}

function MediaNode({ id, data, selected }) {
    return (
        <NodeWrapper id={id} type="media">
            <div className={`px-4 py-3 bg-blue-50 rounded-lg border-2 shadow-lg min-w-[200px] ${selected ? 'border-blue-500' : 'border-blue-200'}`}>
                <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400 border-2 border-white rounded-full" />
                <div className="flex items-center gap-2 mb-2">
                    <Image className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-sm text-blue-700">Send Media</span>
                </div>
                <p className="text-xs text-blue-600 truncate">{data.media_url || 'No Media URL'}</p>
                <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500 border-2 border-white rounded-full" />
            </div>
        </NodeWrapper>
    );
}

function WebhookNode({ id, data, selected }) {
    return (
        <NodeWrapper id={id} type="webhook">
            <div className={`px-4 py-3 bg-teal-50 rounded-lg border-2 shadow-lg min-w-[200px] ${selected ? 'border-teal-500' : 'border-teal-200'}`}>
                <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400 border-2 border-white rounded-full" />
                <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-teal-500" />
                    <span className="font-bold text-sm text-teal-700">API Request</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold bg-teal-200 text-teal-800 px-1 rounded">{data.method || 'GET'}</span>
                    <p className="text-xs text-teal-600 truncate">{data.url || 'http://...'}</p>
                </div>
                <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-teal-500 border-2 border-white rounded-full" />
            </div>
        </NodeWrapper>
    );
}

function EndNode({ id, data }) {
    return (
        <NodeWrapper id={id} type="end">
            <div className="px-4 py-3 bg-red-500 text-white rounded-lg shadow-lg min-w-[120px]">
                <Handle type="target" position={Position.Top} className="w-3 h-3 bg-red-700 border-2 border-white rounded-full" />
                <div className="flex items-center gap-2">
                    <Square className="w-4 h-4" />
                    <span className="font-bold text-sm">End Flow</span>
                </div>
            </div>
        </NodeWrapper>
    );
}

const nodeTypes = {
    start: StartNode,
    message: MessageNode,
    question: QuestionNode,
    action: ActionNode,
    condition: ConditionNode,
    delay: DelayNode,
    media: MediaNode,
    webhook: WebhookNode,
    end: EndNode,
};

function FlowBuilder({ flowId: propFlowId, onClose }) {
    const navigate = useNavigate();
    const params = useParams();
    const flowId = propFlowId || params.id;
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [flowName, setFlowName] = useState('');
    const [triggerKeyword, setTriggerKeyword] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(!!flowId);
    const [selectedNode, setSelectedNode] = useState(null);
    const reactFlowWrapper = React.useRef(null);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);

    useEffect(() => {
        if (flowId) {
            fetchFlow();
        } else {
            // Create default start node
            const startNode = {
                id: 'start-1',
                type: 'start',
                position: { x: 250, y: 50 },
                data: { label: 'Flow starts here' }
            };
            setNodes([startNode]);
        }
    }, [flowId]);

    const fetchFlow = async () => {
        try {
            const res = await axios.get(`/api/app/flows/${flowId}`);
            const flow = res.data;
            setFlowName(flow.name);
            setTriggerKeyword(flow.trigger_keyword);
            if (flow.nodes) {
                setNodes(flow.nodes);
            }
            if (flow.edges) {
                setEdges(flow.edges);
            }
        } catch (e) {
            toast.error('Failed to load flow');
        } finally {
            setLoading(false);
        }
    };

    const onConnect = useCallback((params) => {
        setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    }, [setEdges]);

    const onNodeClick = useCallback((event, node) => {
        setSelectedNode(node);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    const deleteSelectedNode = useCallback(() => {
        if (!selectedNode) return;
        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
        setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
        setSelectedNode(null);
    }, [selectedNode, setNodes, setEdges]);

    const updateNodeData = useCallback((key, value) => {
        setNodes((nds) =>
            nds.map((n) => {
                if (selectedNode && n.id === selectedNode.id) {
                    const updatedNode = { ...n, data: { ...n.data, [key]: value } };
                    setSelectedNode(updatedNode); // keep panel in sync
                    return updatedNode;
                }
                return n;
            })
        );
    }, [selectedNode, setNodes]);

    const getDefaultNodeData = useCallback((type) => {
        switch (type) {
            case 'message':
                return { message: 'Type your message here...' };
            case 'question':
                return { question: 'Ask something...', variable: 'answer' };
            case 'action':
                return { actionType: 'Send to CRM' };
            case 'condition':
                return { condition: 'Check condition' };
            case 'delay':
                return { duration: 5, unit: 'seconds' };
            case 'media':
                return { media_url: '', caption: '' };
            case 'webhook':
                return { method: 'GET', url: '', result_var: 'api_result' };
            case 'end':
                return {};
            default:
                return {};
        }
    }, []);

    const addNode = useCallback((type, position = null) => {
        let finalPos = position;
        // If clicked from sidebar, place precisely at the center of the viewport
        if (!finalPos) {
            if (reactFlowInstance) {
                // Use a standard offset or the exact viewport center if possible.
                // We'll place it slightly offset from the top left to ensure it's visible.
                const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
                finalPos = reactFlowInstance.screenToFlowPosition(center);
            } else {
                finalPos = { x: 300, y: 300 };
            }
        }
        
        const newNode = {
            id: `${type}-${uuidv4()}`,
            type,
            position: finalPos,
            data: getDefaultNodeData(type)
        };
        setNodes((nds) => [...nds, newNode]);
    }, [reactFlowInstance, setNodes, getDefaultNodeData]);

    // Native ReactFlow Drag and Drop Handlers
    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = reactFlowInstance?.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            }) || { x: event.clientX, y: event.clientY };

            addNode(type, position);
        },
        [reactFlowInstance, addNode],
    );

    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleSave = async () => {
        if (!flowName.trim()) {
            toast.error('Flow name is required');
            return;
        }
        if (!triggerKeyword.trim()) {
            toast.error('Trigger keyword is required');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: flowName,
                trigger_keyword: triggerKeyword.toUpperCase(),
                nodes,
                edges
            };

            if (flowId) {
                await axios.put(`/api/app/flows/${flowId}`, payload);
                toast.success('Flow updated');
            } else {
                const res = await axios.post('/api/app/flows', payload);
                toast.success('Flow created');
                navigate(`/chatbot/flows/${res.data.id}`);
            }
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!flowId) return;
        if (!confirm('Delete this flow?')) return;
        try {
            await axios.delete(`/api/app/flows/${flowId}`);
            toast.success('Flow deleted');
            navigate('/chatbot/flows');
        } catch (e) {
            toast.error('Failed to delete');
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    return (
        <div className="flex flex-col w-full" style={{ height: 'calc(100vh - 100px)' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/chatbot/flows')} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <input
                        value={flowName}
                        onChange={(e) => setFlowName(e.target.value)}
                        placeholder="Flow name..."
                        className="text-lg font-bold border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none bg-transparent"
                    />
                    <input
                        value={triggerKeyword}
                        onChange={(e) => setTriggerKeyword(e.target.value.toUpperCase())}
                        placeholder="KEYWORD"
                        className="px-3 py-1 border rounded-lg text-sm font-mono bg-gray-50"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Flow</>}
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div 
                className="flex-1 w-full relative bg-gray-50" 
                style={{ minHeight: '500px' }}
                ref={reactFlowWrapper}
            >
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    nodeTypes={nodeTypes}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    fitView
                    deleteKeyCode={['Backspace', 'Delete']}
                >
                    <Background color="#ccc" gap={16} />
                    <Controls />
                    <MiniMap />
                    
                    {/* Modern Horizontal Palette */}
                    <Panel position="top-center" className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-gray-200 flex flex-row gap-2 m-4 transition-all max-w-[calc(100vw-50px)] overflow-x-auto custom-scrollbar items-center z-10">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2 flex items-center shrink-0">
                            <span>Nodes</span>
                        </div>
                        
                        <div onDragStart={(e) => onDragStart(e, 'message')} draggable onClick={() => addNode('message')} className="px-3 py-1.5 border border-gray-200 rounded-full flex items-center gap-2 cursor-grab hover:bg-indigo-50 hover:border-indigo-300 transition-all bg-white shadow-sm hover:shadow-md group shrink-0">
                            <MessageSquare className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-semibold text-gray-700">Message</span>
                        </div>
                        
                        <div onDragStart={(e) => onDragStart(e, 'question')} draggable onClick={() => addNode('question')} className="px-3 py-1.5 border border-gray-200 rounded-full flex items-center gap-2 cursor-grab hover:bg-purple-50 hover:border-purple-300 transition-all bg-white shadow-sm hover:shadow-md group shrink-0">
                            <Filter className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-semibold text-gray-700">Question</span>
                        </div>
                        
                        <div onDragStart={(e) => onDragStart(e, 'condition')} draggable onClick={() => addNode('condition')} className="px-3 py-1.5 border border-gray-200 rounded-full flex items-center gap-2 cursor-grab hover:bg-yellow-50 hover:border-yellow-300 transition-all bg-white shadow-sm hover:shadow-md group shrink-0">
                            <Bot className="w-4 h-4 text-yellow-500 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-semibold text-gray-700">Condition</span>
                        </div>
                        
                        <div onDragStart={(e) => onDragStart(e, 'action')} draggable onClick={() => addNode('action')} className="px-3 py-1.5 border border-gray-200 rounded-full flex items-center gap-2 cursor-grab hover:bg-orange-50 hover:border-orange-300 transition-all bg-white shadow-sm hover:shadow-md group shrink-0">
                            <Zap className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-semibold text-gray-700">Action</span>
                        </div>
                        
                        <div onDragStart={(e) => onDragStart(e, 'media')} draggable onClick={() => addNode('media')} className="px-3 py-1.5 border border-gray-200 rounded-full flex items-center gap-2 cursor-grab hover:bg-blue-50 hover:border-blue-300 transition-all bg-white shadow-sm hover:shadow-md group shrink-0">
                            <Image className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-semibold text-gray-700">Media</span>
                        </div>
                        
                        <div onDragStart={(e) => onDragStart(e, 'webhook')} draggable onClick={() => addNode('webhook')} className="px-3 py-1.5 border border-gray-200 rounded-full flex items-center gap-2 cursor-grab hover:bg-teal-50 hover:border-teal-300 transition-all bg-white shadow-sm hover:shadow-md group shrink-0">
                            <Globe className="w-4 h-4 text-teal-500 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-semibold text-gray-700">Webhook</span>
                        </div>
                        
                        <div onDragStart={(e) => onDragStart(e, 'delay')} draggable onClick={() => addNode('delay')} className="px-3 py-1.5 border border-gray-200 rounded-full flex items-center gap-2 cursor-grab hover:bg-gray-50 hover:border-gray-400 transition-all bg-white shadow-sm hover:shadow-md group shrink-0">
                            <Clock className="w-4 h-4 text-gray-500 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-semibold text-gray-700">Delay</span>
                        </div>
                        
                        <div className="border-l mx-1 border-gray-200 h-6"></div>
                        
                        <div onDragStart={(e) => onDragStart(e, 'end')} draggable onClick={() => addNode('end')} className="px-3 py-1.5 border border-red-200 rounded-full flex items-center gap-2 cursor-grab hover:bg-red-50 transition-all bg-red-50/30 shadow-sm hover:shadow-md group shrink-0">
                            <CheckCircle className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-semibold text-red-600">End</span>
                        </div>
                    </Panel>

                    {/* Node Properties Editor Panel */}
                    {selectedNode && (
                        <Panel position="top-right" className="bg-white/95 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-gray-200 w-80 m-4 flex flex-col gap-4 transition-all">
                            <div className="flex justify-between items-center border-b pb-3">
                                <h3 className="font-bold text-gray-800 capitalize flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-indigo-500"/> {selectedNode.type} Node
                                </h3>
                                <div className="flex gap-1">
                                    <button onClick={deleteSelectedNode} className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50" title="Delete Node">
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                    <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100" title="Close Panel">
                                        <X className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                            
                            {selectedNode.type === 'message' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Message Text</label>
                                    <textarea 
                                        value={selectedNode.data.message || ''} 
                                        onChange={(e) => updateNodeData('message', e.target.value)}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                        rows={4}
                                        placeholder="Type the message bot will send..."
                                    />
                                </div>
                            )}
                            
                            {selectedNode.type === 'question' && (
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Question Text</label>
                                        <textarea 
                                            value={selectedNode.data.question || ''} 
                                            onChange={(e) => updateNodeData('question', e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                            rows={3}
                                            placeholder="Ask something..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Save Answer To Variable</label>
                                        <input 
                                            value={selectedNode.data.variable || ''} 
                                            onChange={(e) => updateNodeData('variable', e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 font-mono text-indigo-600 shadow-sm"
                                            placeholder="e.g., customer_name"
                                        />
                                    </div>
                                    <div className="pt-2 border-t border-gray-100">
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer mb-2">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedNode.data.use_buttons || false} 
                                                onChange={(e) => updateNodeData('use_buttons', e.target.checked)}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            Use Interactive Buttons
                                        </label>
                                        {selectedNode.data.use_buttons && (
                                            <div className="flex flex-col gap-2 pl-6">
                                                <input value={selectedNode.data.btn1 || ''} onChange={(e) => updateNodeData('btn1', e.target.value)} placeholder="Button 1 Text" className="w-full p-2 border border-gray-300 rounded-md text-xs outline-none focus:border-indigo-500" />
                                                <input value={selectedNode.data.btn2 || ''} onChange={(e) => updateNodeData('btn2', e.target.value)} placeholder="Button 2 Text (Optional)" className="w-full p-2 border border-gray-300 rounded-md text-xs outline-none focus:border-indigo-500" />
                                                <input value={selectedNode.data.btn3 || ''} onChange={(e) => updateNodeData('btn3', e.target.value)} placeholder="Button 3 Text (Optional)" className="w-full p-2 border border-gray-300 rounded-md text-xs outline-none focus:border-indigo-500" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedNode.type === 'delay' && (
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Duration</label>
                                        <input 
                                            type="number"
                                            value={selectedNode.data.duration || ''} 
                                            onChange={(e) => updateNodeData('duration', e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 shadow-sm"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Unit</label>
                                        <select 
                                            value={selectedNode.data.unit || 'seconds'} 
                                            onChange={(e) => updateNodeData('unit', e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 shadow-sm"
                                        >
                                            <option value="seconds">Seconds</option>
                                            <option value="minutes">Minutes</option>
                                            <option value="hours">Hours</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {selectedNode.type === 'condition' && (
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Variable Name</label>
                                        <input 
                                            value={selectedNode.data.variable || ''} 
                                            onChange={(e) => updateNodeData('variable', e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 font-mono text-indigo-600 shadow-sm"
                                            placeholder="e.g., customer_name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Operator</label>
                                        <select 
                                            value={selectedNode.data.operator || 'equals'} 
                                            onChange={(e) => updateNodeData('operator', e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 shadow-sm"
                                        >
                                            <option value="equals">Equals (Exact)</option>
                                            <option value="contains">Contains</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Value to Match</label>
                                        <input 
                                            value={selectedNode.data.value || ''} 
                                            onChange={(e) => updateNodeData('value', e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 shadow-sm"
                                            placeholder="Value to check against..."
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedNode.type === 'action' && (
                                <div className="flex flex-col gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Action Service</label>
                                        <select 
                                            value={selectedNode.data.service || ''} 
                                            onChange={(e) => updateNodeData('service', e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 shadow-sm"
                                        >
                                            <option value="">Select Service...</option>
                                            <option value="handover_human">Handover to Human Agent</option>
                                            <option value="handover_ai">Handover to AI Assistant</option>
                                            <option value="chat_form">Trigger Chat Form</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {selectedNode.type === 'media' && (
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Media URL</label>
                                        <input 
                                            value={selectedNode.data.media_url || ''} 
                                            onChange={(e) => updateNodeData('media_url', e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 shadow-sm"
                                            placeholder="https://example.com/image.jpg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Caption (Optional)</label>
                                        <textarea 
                                            value={selectedNode.data.caption || ''} 
                                            onChange={(e) => updateNodeData('caption', e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 shadow-sm"
                                            rows={2}
                                            placeholder="Media caption..."
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedNode.type === 'webhook' && (
                                <div className="flex flex-col gap-4">
                                    <div className="flex gap-2">
                                        <div className="w-1/3">
                                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Method</label>
                                            <select 
                                                value={selectedNode.data.method || 'GET'} 
                                                onChange={(e) => updateNodeData('method', e.target.value)}
                                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-teal-500 shadow-sm"
                                            >
                                                <option value="GET">GET</option>
                                                <option value="POST">POST</option>
                                            </select>
                                        </div>
                                        <div className="w-2/3">
                                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Save To Var</label>
                                            <input 
                                                value={selectedNode.data.result_var || ''} 
                                                onChange={(e) => updateNodeData('result_var', e.target.value)}
                                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-teal-500 shadow-sm font-mono text-teal-600"
                                                placeholder="api_result"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">API Endpoint URL</label>
                                        <input 
                                            value={selectedNode.data.url || ''} 
                                            onChange={(e) => updateNodeData('url', e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-teal-500 shadow-sm"
                                            placeholder="https://api.example.com/data"
                                        />
                                    </div>
                                    {selectedNode.data.method === 'POST' && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">JSON Payload</label>
                                            <textarea 
                                                value={selectedNode.data.payload || ''} 
                                                onChange={(e) => updateNodeData('payload', e.target.value)}
                                                className="w-full p-2.5 border border-gray-300 rounded-lg text-xs outline-none focus:border-teal-500 shadow-sm font-mono"
                                                rows={4}
                                                placeholder='{"key": "{variable}"}'
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="mt-2 text-[10px] text-gray-400 text-center">Changes are autosaved to the canvas</div>
                        </Panel>
                    )}
                </ReactFlow>
            </div>
        </div>
    );
}

export default function FlowBuilderPage() {
    const params = useParams();
    const flowId = params.id;
    return (
        <ReactFlowProvider>
            <FlowBuilder flowId={flowId} />
        </ReactFlowProvider>
    );
}