import React, { useCallback, useRef } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import MessageBubble from './MessageBubble';
import DateSeparator from './MessageBubble'; // Import DateSeparator if needed

/**
 * VirtualizedMessageList - Renders only visible messages for performance
 * Handles 10k+ messages efficiently
 */
export default function VirtualizedMessageList({
    messages,
    contactProfilePic,
    contactName,
    scrollToBottom,
    itemKey,
    estimatedItemSize = 80,
    onReply,
    onForward,
    onSaveToKb,
    onDelete,
    onEdit,
    onStar,
    onRetry,
    overscanCount = 5,
    className = ''
}) {
    const listRef = useRef(null);
    const sizeMap = useRef({});

    // Get item size dynamically based on message type/content
    const getItemSize = useCallback((index) => {
        const msg = messages[index];
        if (!msg) return estimatedItemSize;

        // Estimate size based on content length and type
        const baseSize = estimatedItemSize;
        const contentLength = msg.content?.length || 0;

        // Add extra height for longer messages
        if (msg.type === 'text' && contentLength > 200) {
            return baseSize + Math.ceil(contentLength / 50) * 15;
        }
        if (msg.type === 'image' || msg.type === 'video') {
            return baseSize + 200; // Media preview height
        }
        if (msg.type === 'document') {
            return baseSize + 60;
        }
        if (msg.type === 'audio') {
            return baseSize + 40;
        }
        return baseSize;
    }, [messages, estimatedItemSize]);

    // Row renderer
    const Row = useCallback(({ index, style }) => {
        const item = messages[index];
        if (!item) return null;

        if (item.type === 'separator') {
            return (
                <div style={style} className="py-2">
                    <DateSeparator dateStr={item.dateStr} />
                </div>
            );
        }

        return (
            <div style={style} className="py-0.5">
                <MessageBubble
                    message={item}
                    contactProfilePic={contactProfilePic}
                    contactName={contactName}
                    onReply={onReply}
                    onForward={onForward}
                    onSaveToKb={onSaveToKb}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onStar={onStar}
                    onRetry={onRetry}
                    isLast={item.isLast}
                    isFirstInGroup={item.isFirstInGroup}
                    isLastInGroup={item.isLastInGroup}
                    showTime={item.showTime}
                />
            </div>
        );
    }, [messages, contactProfilePic, contactName, onReply, onForward, onSaveToKb, onDelete, onEdit, onStar, onRetry]);

    return (
        <AutoSizer>
            {({ height, width }) => (
                <List
                    ref={listRef}
                    height={height || 600}
                    width={width || '100%'}
                    itemCount={messages.length}
                    itemSize={getItemSize}
                    itemKey={itemKey}
                    overscanCount={overscanCount}
                    className={className}
                >
                    {Row}
                </List>
            )}
        </AutoSizer>
    );
}

/**
 * Simple scroll-to-bottom handler for virtualized list
 */
export const scrollToBottomVirtualized = (listRef, messagesLength) => {
    if (listRef?.current && messagesLength > 0) {
        listRef.current.scrollToItem(messagesLength - 1, 'end');
    }
};
