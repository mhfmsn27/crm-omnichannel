/**
 * useInboxModals — Hook managing all modal states and selection modes for InboxPage.
 */
import { useState } from 'react';

export default function useInboxModals() {
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isResolveOpen, setIsResolveOpen] = useState(false);
    const [isForwardOpen, setIsForwardOpen] = useState(false);
    const [isSaveKbOpen, setIsSaveKbOpen] = useState(false);
    const [isWallpaperOpen, setIsWallpaperOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Selection Mode
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedConversationIds, setSelectedConversationIds] = useState([]);

    // Modals data targets
    const [actionTargetConv, setActionTargetConv] = useState(null);
    const [messageToForward, setMessageToForward] = useState(null);
    const [messageToSave, setMessageToSave] = useState(null);
    const [infoMessage, setInfoMessage] = useState(null);

    const onBubbleForward = (msg) => {
        setMessageToForward(msg);
        setIsForwardOpen(true);
    };

    const onBubbleSaveToKb = (msg) => {
        setMessageToSave(msg);
        setIsSaveKbOpen(true);
    };

    const handleMessageInfo = (msg) => {
        setInfoMessage(msg);
    };

    return {
        isTransferOpen,
        setIsTransferOpen,
        isResolveOpen,
        setIsResolveOpen,
        isForwardOpen,
        setIsForwardOpen,
        isSaveKbOpen,
        setIsSaveKbOpen,
        isWallpaperOpen,
        setIsWallpaperOpen,
        isContactModalOpen,
        setIsContactModalOpen,
        isFilterModalOpen,
        setIsFilterModalOpen,
        isLabelModalOpen,
        setIsLabelModalOpen,
        isDiagnosticsOpen,
        setIsDiagnosticsOpen,
        isMenuOpen,
        setIsMenuOpen,
        isSelectionMode,
        setIsSelectionMode,
        selectedConversationIds,
        setSelectedConversationIds,
        actionTargetConv,
        setActionTargetConv,
        messageToForward,
        setMessageToForward,
        messageToSave,
        setMessageToSave,
        infoMessage,
        setInfoMessage,
        onBubbleForward,
        onBubbleSaveToKb,
        handleMessageInfo,
    };
}
