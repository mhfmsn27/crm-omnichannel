import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import ConversationCard from './ConversationCard';

export default function StageCard({ stage, items = [], index, onAddLead, onDeleteStage }) {
    // Calculate Totals
    const totalValue = items.reduce((sum, item) => sum + (item.value || 0), 0);
    const formattedTotal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalValue);

    return (
        <div
            className="flex-shrink-0 w-80 flex flex-col h-full max-h-full bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
        >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-xl">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate pr-2">{stage.name}</h3>
                    <div className="flex gap-1">
                        <button
                            onClick={() => onAddLead(stage.id)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onDeleteStage(stage.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete Stage"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="text-xs text-gray-500 flex gap-3">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{formattedTotal}</span>
                    <span>• {items.length} Leads</span>
                </div>
            </div>

            {/* Droppable Area */}
            <Droppable droppableId={String(stage.id)} type="CONVERSATION">
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto p-3 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''
                            }`}
                    >
                        {items.length === 0 && !snapshot.isDraggingOver && (
                            <div className="text-center py-8 px-4 text-gray-400 text-xs border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                                Tidak ada lead di stage "{stage.name}", silahkan tambahkan dahulu.
                            </div>
                        )}

                        {items.map((item, idx) => (
                            <ConversationCard key={item.id} conversation={item} index={idx} />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}
