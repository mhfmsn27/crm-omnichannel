import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Plus, Download, Edit3, ChevronDown, Filter } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import StageCard from '../../components/pipeline/StageCard';
import ContactSelectionModal from '../../components/inbox/ContactSelectionModal';

export default function PipelineBoardPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [pipeline, setPipeline] = useState(null);
    const [stages, setStages] = useState([]); // Array of stage objects with .items []
    const [loading, setLoading] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Add Lead State
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [targetStageId, setTargetStageId] = useState(null);

    const dropdownRef = React.useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        fetchBoard();
    }, [id]);

    const fetchBoard = async () => {
        setLoading(true);
        try {
            // Get Pipeline Details
            const pipeRes = await axios.get(`/api/app/pipelines/${id}`);
            setPipeline(pipeRes.data);

            // Get Board Data (Stages + Items)
            const boardRes = await axios.get(`/api/app/pipelines/${id}/board`);
            setStages(boardRes.data);
        } catch (err) {
            toast.error("Failed to load board");
            navigate('/pipelines');
        } finally {
            setLoading(false);
        }
    };

    const onDragEnd = async (result) => {
        const { destination, source, draggableId, type } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // Ensure we are moving a Conversation
        if (type !== 'CONVERSATION') return;

        // Find source and dest stages
        const sourceStageIndex = stages.findIndex(s => String(s.id) === source.droppableId);
        const destStageIndex = stages.findIndex(s => String(s.id) === destination.droppableId);

        const sourceStage = stages[sourceStageIndex];
        const destStage = stages[destStageIndex];

        // Optimistic Update
        const newSourceItems = Array.from(sourceStage.items);
        const [movedItem] = newSourceItems.splice(source.index, 1);

        // Update moved item's stage info locally
        movedItem.pipeline_stage_id = destStage.id;

        if (source.droppableId === destination.droppableId) {
            // Same column reorder (not supported by backend yet, but UI should reflect)
            newSourceItems.splice(destination.index, 0, movedItem);
            const newStages = [...stages];
            newStages[sourceStageIndex] = { ...sourceStage, items: newSourceItems };
            setStages(newStages);
        } else {
            // Move to different column
            const newDestItems = Array.from(destStage.items);
            newDestItems.splice(destination.index, 0, movedItem);

            const newStages = [...stages];
            newStages[sourceStageIndex] = { ...sourceStage, items: newSourceItems };
            newStages[destStageIndex] = { ...destStage, items: newDestItems };
            setStages(newStages);

            // API Call
            try {
                await axios.post(`/api/app/conversations/${draggableId}/pipeline`, {
                    pipelineId: id,
                    stageId: destStage.id
                });
            } catch (err) {
                toast.error("Failed to move item");
                fetchBoard(); // Revert
            }
        }
    };

    const handleAddLead = (stageId) => {
        setTargetStageId(stageId);
        setIsContactModalOpen(true);
    };

    const handleContactSelect = async (contact) => {
        if (!targetStageId) return;

        try {
            // 1. Get or Create Conversation
            const convRes = await axios.post('/api/app/inbox/conversations', {
                contact_id: contact.id
            });
            const conversationId = convRes.data.id;

            // 2. Assign to Pipeline Stage
            await axios.post(`/api/app/conversations/${conversationId}/pipeline`, {
                pipelineId: id,
                stageId: targetStageId
            });

            toast.success("Lead added successfully");
            fetchBoard();
        } catch (err) {
            console.error(err);
            toast.error("Failed to add lead");
        }
    };

    const handleDeleteStage = async (stageId) => {
        if (!window.confirm("Delete this stage?")) return;
        try {
            await axios.delete(`/api/app/pipelines/stages/${stageId}`);
            fetchBoard();
        } catch (err) {
            toast.error("Failed to delete stage");
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await axios.get(`/api/app/pipelines/${id}/export`, {
                responseType: 'blob', // Important for file download
            });

            // Create Blob and Trigger Download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `pipeline_export_${id}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error(err);
            toast.error("Failed to export CSV");
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Board...</div>;
    if (!pipeline) return <div className="p-10 text-center">Pipeline not found</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex-shrink-0 px-8 py-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-40 relative">
                {/* Left: Add Lead */}
                <div className="flex items-center gap-4">
                    <button
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
                        onClick={() => handleAddLead(stages[0]?.id)}
                    >
                        <Plus className="w-5 h-5" /> Tambah Lead Masuk
                    </button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportCSV}
                        className="hidden sm:flex px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 items-center gap-2 text-sm text-gray-600 dark:text-gray-300 transition-colors"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>

                    <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>


                    <div className="dropdown dropdown-end" ref={dropdownRef}>
                        <div
                            tabIndex={0}
                            role="button"
                            className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 min-w-[180px] justify-between transition-all cursor-pointer"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span className="font-medium">{pipeline.name}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isDropdownOpen && (
                            <ul tabIndex={0} className="dropdown-content z-[50] menu p-2 shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl w-60 mt-2 absolute top-full right-0">
                                <li>
                                    <button onClick={() => { navigate('/pipelines'); setIsDropdownOpen(false); }} className="rounded-lg py-2 font-medium w-full text-left">
                                        View All Pipelines
                                    </button>
                                </li>
                                <div className="divider my-1"></div>
                                <li>
                                    <button onClick={() => { navigate('/pipelines/create'); setIsDropdownOpen(false); }} className="text-indigo-600 dark:text-indigo-400 font-medium rounded-lg py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center gap-2 w-full text-left">
                                        <Plus className="w-4 h-4" /> Create New Pipeline
                                    </button>
                                </li>
                            </ul>
                        )}
                    </div>

                    <button
                        onClick={() => navigate(`/pipelines/${id}/edit`)}
                        className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 hover:text-indigo-600 transition-colors"
                        title="Edit Pipeline Settings"
                    >
                        <Edit3 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Board Area */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-x-auto overflow-y-hidden">
                    <div className="h-full flex p-6 gap-6 min-w-max">
                        {stages.map((stage, index) => (
                            <StageCard
                                key={stage.id}
                                stage={stage}
                                items={stage.items}
                                index={index}
                                onAddLead={handleAddLead}
                                onDeleteStage={handleDeleteStage}
                            />
                        ))}

                        {/* New Stage Button Column */}
                        <div className="flex-shrink-0 w-80 h-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 cursor-pointer transition-colors"
                            onClick={() => {
                                const name = prompt("Stage Name:");
                                if (name) {
                                    axios.post(`/api/app/pipelines/${id}/stages`, { name, color: '#888888', position: stages.length })
                                        .then(fetchBoard);
                                }
                            }}
                        >
                            <Plus className="w-5 h-5 mr-2" /> Add Stage
                        </div>
                    </div>
                </div>
            </DragDropContext>

            <ContactSelectionModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                onSelect={handleContactSelect}
            />
        </div>
    );
}
