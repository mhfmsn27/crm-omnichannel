import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
    addEdge,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Handle,
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, MessageSquare, HelpCircle, GitMerge, Image as ImageIcon, FileText, Bot, User, Upload, Loader2, Clock, Tag, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Truck } from 'lucide-react'; // Added Truck icon
import { getApiUrl } from '../../../config/api';
import PaywallGuard from '../../../components/common/PaywallGuard';
import { useConfig } from '../../../context/ConfigContext';

// --- CUSTOM NODES ---

const StartNode = () => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-green-500 w-40 text-center">
        <div className="font-bold text-sm text-green-700">START</div>
        <div className="text-xs text-gray-500">Trigger Keyword</div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500" />
    </div>
);

const MessageNode = ({ data }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border border-blue-200 w-60">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
        <div className="flex items-center gap-2 mb-2 border-b pb-1 border-blue-100">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <span className="font-bold text-xs text-blue-700">Send Message</span>
        </div>
        <div className="text-xs text-gray-600 line-clamp-3">{data.message || 'Click to edit...'}</div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400" />
    </div>
);

const QuestionNode = ({ data }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border border-orange-200 w-60">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
        <div className="flex items-center gap-2 mb-2 border-b pb-1 border-orange-100">
            <HelpCircle className="w-4 h-4 text-orange-500" />
            <span className="font-bold text-xs text-orange-700">Ask Question</span>
        </div>
        <div className="text-xs text-gray-600 mb-1">{data.question || 'Question...'}</div>
        <div className="text-[10px] bg-orange-50 p-1 rounded text-orange-600">Save to: {data.variable || 'var'}</div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400" />
    </div>
);

const ConditionNode = ({ data }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border border-purple-200 w-60">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
        <div className="flex items-center gap-2 mb-2 border-b pb-1 border-purple-100">
            <GitMerge className="w-4 h-4 text-purple-500" />
            <span className="font-bold text-xs text-purple-700">Condition</span>
        </div>
        <div className="text-xs text-gray-600 mb-2">IF {data.variable || 'var'} {data.operator || '=='} {data.value || '?'}</div>

        <div className="flex justify-between text-[10px] font-bold">
            <span className="text-green-600">TRUE</span>
            <span className="text-red-600">FALSE</span>
        </div>
        <Handle type="source" position={Position.Bottom} id="true" style={{ left: '20%' }} className="w-3 h-3 bg-green-500" />
        <Handle type="source" position={Position.Bottom} id="false" style={{ left: '80%' }} className="w-3 h-3 bg-red-500" />
    </div>
);

const MediaNode = ({ data }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border border-pink-200 w-60">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
        <div className="flex items-center gap-2 mb-2 border-b pb-1 border-pink-100">
            <ImageIcon className="w-4 h-4 text-pink-500" />
            <span className="font-bold text-xs text-pink-700">Send Media</span>
        </div>
        {data.media_url ? (
            <img src={getApiUrl(data.media_url)} className="w-full h-20 object-cover rounded mb-1" alt="media" />
        ) : (
            <div className="text-xs text-gray-400 italic mb-1">No file selected</div>
        )}
        <div className="text-[10px] text-gray-500 truncate">{data.caption || 'No caption'}</div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400" />
    </div>
);

const ServiceNode = ({ data }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border border-green-200 w-60">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
        <div className="flex items-center gap-2 mb-2 border-b pb-1 border-green-100">
            <Bot className="w-4 h-4 text-green-600" />
            <span className="font-bold text-xs text-green-700">Service Trigger</span>
        </div>
        <div className="text-xs text-gray-600 font-mono">{data.service || 'Select...'}</div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400" />
    </div>
);

const DelayNode = ({ data }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border border-gray-200 w-60">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
        <div className="flex items-center gap-2 mb-2 border-b pb-1 border-gray-100">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="font-bold text-xs text-gray-700">Delay / Wait</span>
        </div>
        <div className="text-xs text-gray-600">Wait: {data.delay_amount || 0} {data.delay_unit || 'minutes'}</div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400" />
    </div>
);

const AddLabelNode = ({ data }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border border-teal-200 w-60">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
        <div className="flex items-center gap-2 mb-2 border-b pb-1 border-teal-100">
            <Tag className="w-4 h-4 text-teal-600" />
            <span className="font-bold text-xs text-teal-700">Add Label</span>
        </div>
        <div className="text-xs text-gray-600">Label ID: {data.label_id || 'Select...'}</div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400" />
    </div>
);

const WebhookNode = ({ data }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border border-indigo-200 w-60">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
        <div className="flex items-center gap-2 mb-2 border-b pb-1 border-indigo-100">
            <Globe className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-xs text-indigo-700">API Request</span>
        </div>
        <div className="text-xs text-gray-600">{data.method || 'GET'} {data.url || 'URL...'}</div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400" />
    </div>
);

const nodeTypes = {
    start: StartNode,
    send_message: MessageNode,
    ask_question: QuestionNode,
    condition: ConditionNode,
    send_media: MediaNode,
    trigger_service: ServiceNode,
    delay: DelayNode,
    add_label: AddLabelNode,
    webhook: WebhookNode
};

// --- MAIN BUILDER ---

export default function FlowBuilderPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [flowName, setFlowName] = useState('');
    const [triggerKeyword, setTriggerKeyword] = useState('');
    const [triggerType, setTriggerType] = useState('exact');

    // Resources for dropdowns
    const [forms, setForms] = useState([]);
    const [labels, setLabels] = useState([]);
    const [loadingRes, setLoadingRes] = useState(true);

    // Editor State
    const [selectedNode, setSelectedNode] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Drag and Drop State
    const reactFlowWrapper = useRef(null);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);

    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

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

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const id = `${type}_${Date.now()}`;
            const newNode = {
                id,
                type,
                position,
                data: { label: type }
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    const { hasFeature } = useConfig();

    useEffect(() => {
        if (!hasFeature('feat_flowbuilder')) return;
        fetchResources();
        if (id) {
            fetchFlow();
        } else {
            setNodes([{ id: 'start', type: 'start', position: { x: 250, y: 5 }, data: { label: 'Start' } }]);
        }
    }, [id, hasFeature]);

    const fetchResources = async () => {
        try {
            const [formRes, labelRes] = await Promise.all([
                axios.get('/api/app/forms'),
                axios.get('/api/app/labels')
            ]);
            setForms(formRes.data);
            setLabels(labelRes.data);
        } catch (e) { } finally { setLoadingRes(false); }
    };

    const fetchFlow = async () => {
        try {
            const res = await axios.get(`/api/app/flows/${id}`);
            setFlowName(res.data.name);
            setTriggerKeyword(res.data.trigger_keyword);
            setTriggerType(res.data.trigger_type || 'exact');
            setNodes(res.data.nodes || []);
            setEdges(res.data.edges || []);
        } catch (err) { toast.error("Failed to load flow"); }
    };

    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const onNodeClick = (event, node) => {
        setSelectedNode(node);
    };

    const updateNodeData = (key, value) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNode.id) {
                    const updated = { ...node, data: { ...node.data, [key]: value } };
                    setSelectedNode(updated);
                    return updated;
                }
                return node;
            })
        );
    };

    const addNode = (type) => {
        const id = `${type}_${Date.now()}`;
        const newNode = {
            id,
            type,
            position: { x: 250, y: nodes.length * 100 + 100 },
            data: { label: type }
        };
        setNodes((nds) => [...nds, newNode]);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post('/api/app/inbox/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            updateNodeData('media_url', res.data.url);
            toast.success("Media uploaded");
        } catch (err) {
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!flowName || !triggerKeyword) return toast.error("Name & Keyword required");
        if (!hasFeature('feat_flowbuilder')) return toast.error("Upgrade required to save flows.");

        // SANITIZE: Remove edges that point to missing nodes (Dangling Edges)
        const validNodeIds = new Set(nodes.map(n => n.id));
        const cleanEdges = edges.filter(e => validNodeIds.has(e.source) && validNodeIds.has(e.target));

        const payload = {
            name: flowName,
            trigger_keyword: triggerKeyword,
            trigger_type: triggerType,
            nodes,
            edges: cleanEdges
        };

        try {
            if (id) await axios.put(`/api/app/flows/${id}`, { ...payload, is_active: true });
            else await axios.post('/api/app/flows', payload);
            toast.success("Flow Saved!");
            navigate('/tools/flow-builder');
        } catch (err) {
            if (err.response && err.response.status === 403) {
                toast.error("Premium Feature Locked");
            } else {
                toast.error("Save Failed");
            }
        }
    };

    return (
        <PaywallGuard feature="feat_flowbuilder" title="Flow Builder Locked" description="Design complex conversation flows.">
            <div className="h-screen flex flex-col bg-gray-50">
                {/* Header */}
                <div className="h-16 bg-white border-b px-6 flex justify-between items-center z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/tools/flow-builder')}><ArrowLeft className="w-5 h-5 text-gray-500" /></button>
                        <input
                            className="font-bold text-lg border-none outline-none"
                            placeholder="Flow Name"
                            value={flowName}
                            onChange={e => setFlowName(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <select
                            className="border p-1.5 rounded text-sm bg-gray-50 focus:outline-none"
                            value={triggerType}
                            onChange={e => setTriggerType(e.target.value)}
                        >
                            <option value="exact">Exact Match</option>
                            <option value="contains">Contains</option>
                        </select>
                        <input
                            className="border p-1.5 rounded text-sm font-mono bg-gray-50"
                            placeholder="Trigger Keyword"
                            value={triggerKeyword}
                            onChange={e => setTriggerKeyword(e.target.value)}
                        />
                        <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 text-sm">
                            <Save className="w-4 h-4" /> Save Flow
                        </button>
                    </div>
                </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Palette */}
                    <div className="w-64 bg-white border-r p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                        <p className="text-xs font-bold text-gray-400 uppercase">Messaging</p>
                        <button onDragStart={(event) => onDragStart(event, 'send_message')} draggable onClick={() => addNode('send_message')} className="flex items-center gap-2 p-3 border rounded hover:bg-blue-50 text-sm font-medium text-gray-700 cursor-grab active:cursor-grabbing">
                            <MessageSquare className="w-4 h-4 text-blue-500" /> Send Text
                        </button>
                        <button onDragStart={(event) => onDragStart(event, 'send_media')} draggable onClick={() => addNode('send_media')} className="flex items-center gap-2 p-3 border rounded hover:bg-pink-50 text-sm font-medium text-gray-700 cursor-grab active:cursor-grabbing">
                            <ImageIcon className="w-4 h-4 text-pink-500" /> Send Media
                        </button>

                        <p className="text-xs font-bold text-gray-400 uppercase mt-2">Logic</p>
                        <button onDragStart={(event) => onDragStart(event, 'ask_question')} draggable onClick={() => addNode('ask_question')} className="flex items-center gap-2 p-3 border rounded hover:bg-orange-50 text-sm font-medium text-gray-700 cursor-grab active:cursor-grabbing">
                            <HelpCircle className="w-4 h-4 text-orange-500" /> Ask Input
                        </button>
                        <button onDragStart={(event) => onDragStart(event, 'condition')} draggable onClick={() => addNode('condition')} className="flex items-center gap-2 p-3 border rounded hover:bg-purple-50 text-sm font-medium text-gray-700 cursor-grab active:cursor-grabbing">
                            <GitMerge className="w-4 h-4 text-purple-500" /> Condition
                        </button>

                        <p className="text-xs font-bold text-gray-400 uppercase mt-2">Integration</p>
                        <button onDragStart={(event) => onDragStart(event, 'trigger_service')} draggable onClick={() => addNode('trigger_service')} className="flex items-center gap-2 p-3 border rounded hover:bg-green-50 text-sm font-medium text-gray-700 cursor-grab active:cursor-grabbing">
                            <Bot className="w-4 h-4 text-green-600" /> Feature / Bot
                        </button>
                        <button onDragStart={(event) => onDragStart(event, 'delay')} draggable onClick={() => addNode('delay')} className="flex items-center gap-2 p-3 border rounded hover:bg-gray-100 text-sm font-medium text-gray-700 cursor-grab active:cursor-grabbing">
                            <Clock className="w-4 h-4 text-gray-600" /> Delay / Wait
                        </button>
                        <button onDragStart={(event) => onDragStart(event, 'add_label')} draggable onClick={() => addNode('add_label')} className="flex items-center gap-2 p-3 border rounded hover:bg-teal-50 text-sm font-medium text-gray-700 cursor-grab active:cursor-grabbing">
                            <Tag className="w-4 h-4 text-teal-600" /> Add Label
                        </button>
                        <button onDragStart={(event) => onDragStart(event, 'webhook')} draggable onClick={() => addNode('webhook')} className="flex items-center gap-2 p-3 border rounded hover:bg-indigo-50 text-sm font-medium text-gray-700 cursor-grab active:cursor-grabbing">
                            <Globe className="w-4 h-4 text-indigo-600" /> API Request
                        </button>
                    </div>

                    {/* Canvas */}
                    <div className="flex-1 h-full" ref={reactFlowWrapper}>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={onNodeClick}
                            onInit={setReactFlowInstance}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            nodeTypes={nodeTypes}
                            fitView
                        >
                            <Background />
                            <Controls />
                            <MiniMap />
                        </ReactFlow>
                    </div>

                    {/* Properties Panel */}
                    {selectedNode && selectedNode.type !== 'start' && (
                        <div className="w-80 bg-white border-l p-4 overflow-y-auto shadow-xl z-20">
                            <div className="flex justify-between items-center mb-4 pb-2 border-b">
                                <h3 className="font-bold text-gray-800">Edit Node</h3>
                                <button onClick={() => setSelectedNode(null)}><ArrowLeft className="w-4 h-4" /></button>
                            </div>

                            {selectedNode.type === 'send_message' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message</label>
                                    <textarea
                                        className="w-full border p-2 rounded h-32 text-sm"
                                        value={selectedNode.data.message || ''}
                                        onChange={e => updateNodeData('message', e.target.value)}
                                        placeholder="Type message..."
                                    />
                                </div>
                            )}

                            {selectedNode.type === 'send_media' && (
                                <div className="space-y-4">
                                    <div className="border-2 border-dashed p-4 text-center rounded-lg hover:bg-gray-50 relative cursor-pointer">
                                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} />
                                        {uploading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /> : (
                                            selectedNode.data.media_url ? (
                                                <img src={getApiUrl(selectedNode.data.media_url)} className="h-32 object-contain mx-auto" alt="prev" />
                                            ) : (
                                                <>
                                                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                                                    <span className="text-xs text-gray-500">Upload Image/Video/PDF</span>
                                                </>
                                            )
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Caption</label>
                                        <textarea
                                            className="w-full border p-2 rounded h-20 text-sm"
                                            value={selectedNode.data.caption || ''}
                                            onChange={e => updateNodeData('caption', e.target.value)}
                                            placeholder="Optional caption..."
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedNode.type === 'ask_question' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Question</label>
                                        <textarea
                                            className="w-full border p-2 rounded h-24 text-sm"
                                            value={selectedNode.data.question || ''}
                                            onChange={e => updateNodeData('question', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Save to Variable</label>
                                        <input
                                            className="w-full border p-2 rounded text-sm"
                                            value={selectedNode.data.variable || ''}
                                            onChange={e => updateNodeData('variable', e.target.value)}
                                            placeholder="e.g. user_name"
                                        />
                                    </div>
                                    <div className="pt-2 border-t mt-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                                            <input type="checkbox" checked={selectedNode.data.use_buttons || false} onChange={e => updateNodeData('use_buttons', e.target.checked)} />
                                            Use Interactive Buttons
                                        </label>
                                        {selectedNode.data.use_buttons && (
                                            <div className="mt-2 space-y-2">
                                                <input className="w-full border p-2 rounded text-sm" placeholder="Button 1" value={selectedNode.data.btn1 || ''} onChange={e => updateNodeData('btn1', e.target.value)} />
                                                <input className="w-full border p-2 rounded text-sm" placeholder="Button 2" value={selectedNode.data.btn2 || ''} onChange={e => updateNodeData('btn2', e.target.value)} />
                                                <input className="w-full border p-2 rounded text-sm" placeholder="Button 3" value={selectedNode.data.btn3 || ''} onChange={e => updateNodeData('btn3', e.target.value)} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedNode.type === 'condition' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Variable</label>
                                        <input
                                            className="w-full border p-2 rounded text-sm"
                                            value={selectedNode.data.variable || ''}
                                            onChange={e => updateNodeData('variable', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Operator</label>
                                        <select
                                            className="w-full border p-2 rounded text-sm bg-white"
                                            value={selectedNode.data.operator || 'equals'}
                                            onChange={e => updateNodeData('operator', e.target.value)}
                                        >
                                            <option value="equals">Equals</option>
                                            <option value="contains">Contains</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Value</label>
                                        <input
                                            className="w-full border p-2 rounded text-sm"
                                            value={selectedNode.data.value || ''}
                                            onChange={e => updateNodeData('value', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedNode.type === 'trigger_service' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service Action</label>
                                        <select
                                            className="w-full border p-2 rounded text-sm"
                                            value={selectedNode.data.service || ''}
                                            onChange={e => updateNodeData('service', e.target.value)}
                                        >
                                            <option value="">-- Select --</option>
                                            <option value="chat_form">Start Chat Form</option>
                                            <option value="handover_human">Handover to Human Agent</option>
                                            <option value="handover_ai">Handover to AI Assistant</option>
                                        </select>
                                    </div>
                                    {selectedNode.data.service === 'chat_form' && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Form</label>
                                            <select
                                                className="w-full border p-2 rounded text-sm"
                                                value={selectedNode.data.target_id || ''}
                                                onChange={e => updateNodeData('target_id', e.target.value)}
                                            >
                                                <option value="">-- Select --</option>
                                                {forms.map(f => (
                                                    <option key={f.id} value={f.id}>{f.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800">
                                        Note: Triggering a service will <strong>terminate this flow</strong> and hand over control to the selected module.
                                    </div>
                                </div>
                            )}

                            {selectedNode.type === 'delay' && (
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Wait Duration</label>
                                    <div className="flex gap-2">
                                        <input type="number" className="w-1/2 border p-2 rounded text-sm" value={selectedNode.data.delay_amount || ''} onChange={e => updateNodeData('delay_amount', e.target.value)} />
                                        <select className="w-1/2 border p-2 rounded text-sm" value={selectedNode.data.delay_unit || 'minutes'} onChange={e => updateNodeData('delay_unit', e.target.value)}>
                                            <option value="minutes">Minutes</option>
                                            <option value="hours">Hours</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {selectedNode.type === 'add_label' && (
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Label</label>
                                    <select className="w-full border p-2 rounded text-sm" value={selectedNode.data.label_id || ''} onChange={e => updateNodeData('label_id', e.target.value)}>
                                        <option value="">-- Select Label --</option>
                                        {labels.map(l => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedNode.type === 'webhook' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Method & URL</label>
                                        <div className="flex gap-2 mb-2">
                                            <select className="border p-2 rounded text-sm bg-gray-50" value={selectedNode.data.method || 'GET'} onChange={e => updateNodeData('method', e.target.value)}>
                                                <option value="GET">GET</option>
                                                <option value="POST">POST</option>
                                            </select>
                                            <input className="flex-1 border p-2 rounded text-sm" placeholder="https://..." value={selectedNode.data.url || ''} onChange={e => updateNodeData('url', e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payload (JSON)</label>
                                        <textarea className="w-full border p-2 rounded h-24 text-sm font-mono" placeholder='{"key": "{var_name}"}' value={selectedNode.data.payload || ''} onChange={e => updateNodeData('payload', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Save Result To Variable</label>
                                        <input className="w-full border p-2 rounded text-sm" placeholder="api_result" value={selectedNode.data.result_var || ''} onChange={e => updateNodeData('result_var', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
                                    setSelectedNode(null);
                                }}
                                className="w-full mt-6 bg-red-50 text-red-600 py-2 rounded border border-red-200 text-sm font-bold hover:bg-red-100"
                            >
                                Delete Node
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </PaywallGuard >
    );
}