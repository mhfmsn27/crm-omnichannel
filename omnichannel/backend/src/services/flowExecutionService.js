import pool from '../config/db.js';
import * as waService from './waGatewayService.js';
import crypto from 'crypto';

/**
 * Main Flow Execution Engine for React Flow JSON
 */
export const processFlow = async (organization_id, conversationId, contactPhone, sessionId, io, incomingText) => {
    // 1. Get Conversation State
    const convRes = await pool.query(
        'SELECT current_flow_id, current_node_id, system_metadata FROM conversations WHERE id = $1 AND organization_id = $2',
        [conversationId, organization_id]
    );
    if (convRes.rows.length === 0) return { handled: false };

    let { current_flow_id, current_node_id, system_metadata } = convRes.rows[0];
    system_metadata = system_metadata || {};
    system_metadata.flow_variables = system_metadata.flow_variables || {};

    let flowData = null;

    // 2. Check for Trigger Keyword if no flow is active
    if (!current_flow_id) {
        if (!incomingText) return { handled: false };
        const textUpper = incomingText.trim().toUpperCase();
        
        const triggerRes = await pool.query(
            "SELECT id, nodes, edges FROM chat_flows WHERE organization_id = $1 AND is_active = true AND trigger_keyword = $2 LIMIT 1",
            [organization_id, textUpper]
        );

        if (triggerRes.rows.length === 0) return { handled: false };

        flowData = triggerRes.rows[0];
        current_flow_id = flowData.id;
        
        let nodes = typeof flowData.nodes === 'string' ? JSON.parse(flowData.nodes) : flowData.nodes;
        let edges = typeof flowData.edges === 'string' ? JSON.parse(flowData.edges) : flowData.edges;
        
        if (!Array.isArray(nodes) || nodes.length === 0) return { handled: false };

        const targetNodeIds = new Set((edges || []).map(e => e.target));
        const startNode = nodes.find(n => n.type === 'start' || n.type === 'trigger' || !targetNodeIds.has(n.id));
        
        if (!startNode) return { handled: false }; // Malformed flow
        
        current_node_id = startNode.id;
        console.log(`[FlowEngine] Flow ${current_flow_id} triggered for conversation ${conversationId}`);
    } else {
        // Load active flow
        const flowRes = await pool.query(
            "SELECT nodes, edges FROM chat_flows WHERE id = $1 AND organization_id = $2 AND is_active = true",
            [current_flow_id, organization_id]
        );
        if (flowRes.rows.length === 0) {
            // Flow deleted or deactivated, reset state
            await clearFlowState(conversationId);
            return { handled: false };
        }
        flowData = flowRes.rows[0];
    }

    let nodes = typeof flowData.nodes === 'string' ? JSON.parse(flowData.nodes) : flowData.nodes;
    let edges = typeof flowData.edges === 'string' ? JSON.parse(flowData.edges) : flowData.edges;
    if (!Array.isArray(nodes)) nodes = [];
    if (!Array.isArray(edges)) edges = [];

    // Helper to replace {{variable}} in string template
    const interpolate = (template) => {
        if (!template || typeof template !== 'string') return template || '';
        let result = template;
        Object.keys(system_metadata.flow_variables || {}).forEach(key => {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), system_metadata.flow_variables[key] ?? '');
        });
        return result;
    };

    // 3. Execution Loop
    let currentNode = nodes.find(n => n.id === current_node_id);
    let keepRunning = true;
    let handled = true;
    let iterationCount = 0;
    const MAX_ITERATIONS = 50;

    while (keepRunning && currentNode) {
        iterationCount++;
        if (iterationCount > MAX_ITERATIONS) {
            console.error(`[FlowEngine] Infinite loop detected for Flow ${current_flow_id}. Aborting.`);
            break;
        }

        console.log(`[FlowEngine] Executing Node: ${currentNode.id} (${currentNode.type})`);
        
        let nextNodeId = null;

        switch (currentNode.type) {
            case 'trigger':
            case 'start':
                // Just pass through
                nextNodeId = getNextNode(currentNode.id, edges);
                break;

            case 'sendMessage':
            case 'message':
            case 'send_message': {
                const rawText = currentNode.data?.message || currentNode.data?.text || currentNode.data?.content;
                if (rawText) {
                    const text = interpolate(rawText);
                    await sendMessageToContact(conversationId, organization_id, contactPhone, sessionId, text, io);
                }
                nextNodeId = getNextNode(currentNode.id, edges);
                break;
            }

            case 'askQuestion':
            case 'waitInput':
            case 'question':
            case 'ask_question': {
                if (!system_metadata.waiting_for_input) {
                    const promptText = interpolate(currentNode.data?.question || currentNode.data?.text || currentNode.data?.message || 'Silakan balas pesan ini:');
                    
                    // Check if interactive buttons or quick replies configured
                    const hasButtons = currentNode.data?.use_buttons || currentNode.data?.buttons || (currentNode.data?.btn1 || currentNode.data?.btn2 || currentNode.data?.btn3);
                    let buttonList = [];
                    if (hasButtons) {
                        if (Array.isArray(currentNode.data?.buttons)) {
                            buttonList = currentNode.data.buttons.map(b => typeof b === 'object' ? (b.text || b.label || '') : String(b)).filter(Boolean);
                        } else {
                            buttonList = [currentNode.data?.btn1, currentNode.data?.btn2, currentNode.data?.btn3].filter(Boolean);
                        }
                    }

                    let messageToSend = promptText;
                    if (buttonList.length > 0) {
                        messageToSend += '\n\n' + buttonList.map((btn, idx) => `${idx + 1}. ${btn}`).join('\n');
                    }

                    await sendMessageToContact(conversationId, organization_id, contactPhone, sessionId, messageToSend, io);
                    system_metadata.waiting_for_input = true;
                    system_metadata.active_question_node = currentNode.id;
                    keepRunning = false; // Pause execution until contact sends reply
                } else {
                    const varName = currentNode.data?.variable || currentNode.data?.variableName || 'last_input';
                    const answer = (incomingText || '').trim();
                    system_metadata.flow_variables[varName] = answer;
                    system_metadata.waiting_for_input = false;
                    system_metadata.active_question_node = null;

                    // Check if an edge specifically branches by button index or title
                    const cleanAnswer = answer.toLowerCase();
                    const branchEdge = edges.find(e => 
                        e.source === currentNode.id && (
                            e.sourceHandle?.toLowerCase() === cleanAnswer || 
                            e.label?.toLowerCase() === cleanAnswer ||
                            (e.sourceHandle === 'btn1' && cleanAnswer === '1') ||
                            (e.sourceHandle === 'btn2' && cleanAnswer === '2') ||
                            (e.sourceHandle === 'btn3' && cleanAnswer === '3')
                        )
                    );

                    nextNodeId = branchEdge ? branchEdge.target : getNextNode(currentNode.id, edges);
                }
                break;
            }

            case 'condition': {
                const conditionVar = currentNode.data?.variable || currentNode.data?.variableName || 'last_input';
                const conditionVal = String(currentNode.data?.value ?? '').trim().toLowerCase();
                const userVal = String(system_metadata.flow_variables[conditionVar] ?? '').trim().toLowerCase();
                const op = currentNode.data?.operator || 'equals';
                
                let isMatch = false;
                switch (op) {
                    case 'contains':
                        isMatch = userVal.includes(conditionVal);
                        break;
                    case 'not_contains':
                        isMatch = !userVal.includes(conditionVal);
                        break;
                    case 'not_equals':
                        isMatch = userVal !== conditionVal;
                        break;
                    case 'greater_than':
                        isMatch = Number(userVal) > Number(conditionVal);
                        break;
                    case 'less_than':
                        isMatch = Number(userVal) < Number(conditionVal);
                        break;
                    case 'is_empty':
                        isMatch = userVal === '';
                        break;
                    case 'is_not_empty':
                        isMatch = userVal !== '';
                        break;
                    case 'equals':
                    default:
                        isMatch = userVal === conditionVal;
                        break;
                }

                // Match 'yes' / 'true' vs 'no' / 'false'
                const trueEdge = edges.find(e => 
                    e.source === currentNode.id && (
                        ['yes', 'true', 'True', 'a', '1', 'success'].includes(e.sourceHandle) ||
                        ['yes', 'true', 'True', 'Yes', 'Benar'].includes(e.label)
                    )
                );
                const falseEdge = edges.find(e => 
                    e.source === currentNode.id && (
                        ['no', 'false', 'False', 'b', '2', 'failed'].includes(e.sourceHandle) ||
                        ['no', 'false', 'False', 'No', 'Salah'].includes(e.label)
                    )
                );

                if (isMatch && trueEdge) nextNodeId = trueEdge.target;
                else if (!isMatch && falseEdge) nextNodeId = falseEdge.target;
                else nextNodeId = getNextNode(currentNode.id, edges); // Fallback
                break;
            }

            case 'interactive_buttons':
            case 'buttons':
            case 'listMenu': {
                if (!system_metadata.waiting_for_input) {
                    const header = interpolate(currentNode.data?.text || currentNode.data?.header || 'Silakan pilih menu berikut:');
                    const buttons = currentNode.data?.buttons || currentNode.data?.options || [];
                    
                    let formattedText = header;
                    if (buttons.length > 0) {
                        formattedText += '\n\n' + buttons.map((b, idx) => `${idx + 1}. ${b.text || b.label || b}`).join('\n');
                    }
                    
                    await sendMessageToContact(conversationId, organization_id, contactPhone, sessionId, formattedText, io);
                    system_metadata.waiting_for_input = true;
                    system_metadata.active_button_node = currentNode.id;
                    keepRunning = false;
                } else {
                    const varName = currentNode.data?.variable || currentNode.data?.variableName || 'selected_option';
                    system_metadata.flow_variables[varName] = (incomingText || '').trim();
                    system_metadata.waiting_for_input = false;
                    system_metadata.active_button_node = null;
                    
                    const cleanChoice = (incomingText || '').trim().toLowerCase();
                    const branchEdge = edges.find(e => 
                        e.source === currentNode.id && 
                        (e.sourceHandle?.toLowerCase() === cleanChoice || e.label?.toLowerCase() === cleanChoice)
                    );
                    
                    nextNodeId = branchEdge ? branchEdge.target : getNextNode(currentNode.id, edges);
                }
                break;
            }

            case 'delay': {
                const duration = Number(currentNode.data?.duration || currentNode.data?.delaySeconds || 1);
                const unit = currentNode.data?.unit || 'seconds';
                const multiplier = unit === 'minutes' ? 60000 : 1000;
                const delayMs = Math.min(10000, Math.max(500, duration * multiplier));
                await new Promise(resolve => setTimeout(resolve, delayMs));
                nextNodeId = getNextNode(currentNode.id, edges);
                break;
            }

            case 'media':
            case 'send_media': {
                const mediaUrl = currentNode.data?.media_url || currentNode.data?.url;
                const caption = interpolate(currentNode.data?.caption || '');
                if (mediaUrl) {
                    await sendMediaToContact(conversationId, organization_id, contactPhone, sessionId, mediaUrl, caption, io);
                }
                nextNodeId = getNextNode(currentNode.id, edges);
                break;
            }

            case 'http_request':
            case 'webhook': {
                const rawUrl = currentNode.data?.url;
                const method = (currentNode.data?.method || 'GET').toUpperCase();
                const responseVar = currentNode.data?.result_var || currentNode.data?.responseVariable || 'api_response';

                if (rawUrl) {
                    const url = interpolate(rawUrl);
                    try {
                        const axios = (await import('axios')).default;
                        let apiRes;
                        if (method === 'POST') {
                            let postData = {
                                phone: contactPhone,
                                variables: system_metadata.flow_variables
                            };
                            if (currentNode.data?.payload) {
                                try {
                                    postData = JSON.parse(interpolate(currentNode.data.payload));
                                } catch (e) {
                                    postData = interpolate(currentNode.data.payload);
                                }
                            }
                            apiRes = await axios.post(url, postData, { timeout: 5000 });
                        } else {
                            apiRes = await axios.get(url, {
                                params: { phone: contactPhone, ...system_metadata.flow_variables },
                                timeout: 5000
                            });
                        }
                        system_metadata.flow_variables[responseVar] = typeof apiRes.data === 'object' ? JSON.stringify(apiRes.data) : String(apiRes.data);
                    } catch (apiErr) {
                        console.warn(`[FlowEngine] HTTP Request Node failed: ${apiErr.message}`);
                        system_metadata.flow_variables[responseVar] = 'ERROR';
                    }
                }
                nextNodeId = getNextNode(currentNode.id, edges);
                break;
            }

            case 'action':
            case 'trigger_service':
            case 'add_label':
            case 'handoff':
            case 'escalate': {
                const actionType = (currentNode.data?.service || currentNode.data?.actionType || currentNode.type || '').toLowerCase();
                
                if (actionType === 'handoff' || actionType === 'escalate' || actionType === 'assign_agent') {
                    await pool.query("UPDATE conversations SET is_chatbot_active = false, status = 'needs_agent' WHERE id = $1", [conversationId]);
                    io?.to(`org_${organization_id}`).emit('bot_escalated', { conversationId, alert: true, reason: 'Flow Handoff Node' });
                    const noticeText = interpolate(currentNode.data?.text || currentNode.data?.message || "Menyambungkan ke Agen kami...");
                    await sendMessageToContact(conversationId, organization_id, contactPhone, sessionId, noticeText, io);
                    nextNodeId = null; // Stops flow to let human agent take over
                } else if (actionType === 'add_tag' || actionType === 'add_label') {
                    const labelName = currentNode.data?.label || currentNode.data?.tag || currentNode.data?.label_name;
                    if (labelName) {
                        try {
                            const lblRes = await pool.query(
                                "SELECT id FROM labels WHERE organization_id = $1 AND name ILIKE $2 LIMIT 1",
                                [organization_id, labelName]
                            );
                            if (lblRes.rows.length > 0) {
                                await pool.query(
                                    "INSERT INTO conversation_labels (conversation_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                                    [conversationId, lblRes.rows[0].id]
                                );
                            }
                        } catch (lblErr) {
                            console.warn('[FlowEngine] Error adding label in action node:', lblErr.message);
                        }
                    }
                    nextNodeId = getNextNode(currentNode.id, edges);
                } else if (actionType === 'mark_lead') {
                    await pool.query(
                        "UPDATE contacts SET is_lead = true WHERE phone = $1 AND organization_id = $2",
                        [contactPhone, organization_id]
                    );
                    nextNodeId = getNextNode(currentNode.id, edges);
                } else {
                    nextNodeId = getNextNode(currentNode.id, edges);
                }
                break;
            }

            case 'end': {
                keepRunning = false;
                current_flow_id = null;
                current_node_id = null;
                system_metadata.waiting_for_input = false;
                break;
            }

            default:
                console.warn(`[FlowEngine] Unknown node type: ${currentNode.type}`);
                nextNodeId = getNextNode(currentNode.id, edges);
                break;
        }

        if (keepRunning) {
            current_node_id = nextNodeId;
            currentNode = nodes.find(n => n.id === current_node_id);
            if (!currentNode) {
                // Flow finished
                keepRunning = false;
                current_flow_id = null;
                current_node_id = null;
                system_metadata.waiting_for_input = false;
            }
        }
    }

    // 4. Save State
    await pool.query(
        'UPDATE conversations SET current_flow_id = $1, current_node_id = $2, system_metadata = $3 WHERE id = $4',
        [current_flow_id, current_node_id, JSON.stringify(system_metadata), conversationId]
    );

    return { handled };
};

const getNextNode = (sourceId, edges) => {
    const edge = edges.find(e => e.source === sourceId);
    return edge ? edge.target : null;
};

const clearFlowState = async (conversationId) => {
    await pool.query(
        "UPDATE conversations SET current_flow_id = NULL, current_node_id = NULL, system_metadata = system_metadata - 'waiting_for_input' WHERE id = $1",
        [conversationId]
    );
};

const sendMessageToContact = async (conversationId, orgId, phone, sessionId, text, io) => {
    const tempWaMessageId = `flow.res.${crypto.randomUUID()}`;
    const insertRes = await pool.query(
        'INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6) RETURNING id', 
        [conversationId, orgId, 'text', text, 'sent', tempWaMessageId]
    );
    const dbMessageId = insertRes.rows[0]?.id;
    
    if (io) {
        io.to(`org_${orgId}`).emit('new_message', { 
            conversationId, 
            message: { id: dbMessageId || tempWaMessageId, wa_message_id: tempWaMessageId, content: text, type: 'text', from_me: true, status: 'sent' }
        });
    }
    
    await pool.query(`UPDATE conversations SET last_message = $1, last_message_at = NOW(), last_message_from_me = true, last_message_status = 'sent' WHERE id = $2`, [text, conversationId]);
    
    try {
        const sendResult = await waService.sendText(sessionId, phone, text);
        const realWamid = sendResult?.data?.key?.id || sendResult?.messageId || sendResult?.id || sendResult?.key?.id;
        if (realWamid && dbMessageId) {
            await pool.query('UPDATE messages SET wa_message_id = $1 WHERE id = $2', [realWamid, dbMessageId]);
        }
    } catch (sendErr) {
        console.error('[FlowEngine] Error sending text to contact:', sendErr.message);
        if (dbMessageId) {
            await pool.query("UPDATE messages SET status = 'failed' WHERE id = $1", [dbMessageId]);
        }
    }
};

const sendMediaToContact = async (conversationId, orgId, phone, sessionId, mediaUrl, caption, io) => {
    const tempWaMessageId = `flow.res.${crypto.randomUUID()}`;
    const insertRes = await pool.query(
        'INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6, $7) RETURNING id', 
        [conversationId, orgId, 'image', caption || 'Media', mediaUrl, 'sent', tempWaMessageId]
    );
    const dbMessageId = insertRes.rows[0]?.id;
    
    if (io) {
        io.to(`org_${orgId}`).emit('new_message', { 
            conversationId, 
            message: { id: dbMessageId || tempWaMessageId, wa_message_id: tempWaMessageId, content: caption || 'Media', media_url: mediaUrl, type: 'image', from_me: true, status: 'sent' }
        });
    }
    
    await pool.query(`UPDATE conversations SET last_message = $1, last_message_at = NOW(), last_message_from_me = true, last_message_status = 'sent' WHERE id = $2`, [caption || 'Media File', conversationId]);
    
    try {
        const sendResult = await waService.sendMedia(sessionId, phone, mediaUrl, caption);
        const realWamid = sendResult?.data?.key?.id || sendResult?.messageId || sendResult?.id || sendResult?.key?.id;
        if (realWamid && dbMessageId) {
            await pool.query('UPDATE messages SET wa_message_id = $1 WHERE id = $2', [realWamid, dbMessageId]);
        }
    } catch (sendErr) {
        console.error('[FlowEngine] Error sending media to contact:', sendErr.message);
        if (dbMessageId) {
            await pool.query("UPDATE messages SET status = 'failed' WHERE id = $1", [dbMessageId]);
        }
    }
};
