import pool from '../config/db.js';
import * as waService from './waGatewayService.js';
import * as formService from './formService.js';
import * as rajaongkir from './integrations/rajaongkirClient.js'; // Imported RajaOngkir

/**
 * Core Engine to execute Flow Steps
 */
export const processIncomingMessage = async (orgId, contactId, dbSessionId, gatewaySessionId, text, senderPhone) => {
    if (!text) return { handled: false };
    const cleanText = text.trim();

    // 1. CHECK ACTIVE SESSION
    const sessionRes = await pool.query(
        `SELECT fs.*, cf.nodes, cf.edges 
         FROM flow_sessions fs
         JOIN chat_flows cf ON fs.flow_id = cf.id
         WHERE fs.contact_id = $1 AND fs.status = 'active'`,
        [contactId]
    );

    let session = null;
    let nodes = [];
    let edges = [];

    if (sessionRes.rows.length > 0) {
        session = sessionRes.rows[0];
        nodes = session.nodes;
        edges = session.edges;

        const currentNode = nodes.find(n => n.id === session.current_node_id);

        if (currentNode && currentNode.type === 'ask_question') {
            const varName = currentNode.data.variable || `var_${currentNode.id}`;
            const variables = session.variables || {};
            variables[varName] = cleanText;

            await pool.query('UPDATE flow_sessions SET variables = $1 WHERE id = $2', [variables, session.id]);

            await moveNext(session.id, currentNode.id, nodes, edges, gatewaySessionId, senderPhone, variables, orgId, contactId);
            return { handled: true, type: 'flow' };
        } else {
            // Auto-resume: Try to move next from this stuck node if it's not a question
            const variables = session.variables || {};
            await moveNext(session.id, currentNode.id, nodes, edges, gatewaySessionId, senderPhone, variables, orgId, contactId);
            return { handled: true, type: 'flow' };
        }

    } else {
        // 2. CHECK TRIGGERS OR BROADCAST FLOW (New Session)
        let flowRes = await pool.query(
            `SELECT * FROM chat_flows 
             WHERE organization_id = $1 AND is_active = true 
             AND (
                 (trigger_type = 'exact' AND $2 ILIKE trigger_keyword) OR 
                 (trigger_type = 'contains' AND $2 ILIKE '%' || trigger_keyword || '%') OR
                 (trigger_type IS NULL AND $2 ILIKE trigger_keyword)
             )`,
            [orgId, cleanText]
        );

        if (flowRes.rows.length === 0) {
            // Check if contact replied to a recent broadcast with a flow attached
            const bcRes = await pool.query(`
                SELECT cf.* 
                FROM contacts c
                JOIN broadcasts b ON c.last_broadcast_id = b.id
                JOIN chat_flows cf ON b.flow_id = cf.id
                WHERE c.id = $1 
                  AND cf.is_active = true
                  AND c.last_broadcast_at >= NOW() - INTERVAL '24 hours'
            `, [contactId]);

            if (bcRes.rows.length > 0) {
                flowRes = bcRes;
                // Clear the last_broadcast_id so it only triggers once
                await pool.query('UPDATE contacts SET last_broadcast_id = NULL WHERE id = $1', [contactId]);
                console.log(`[FlowEngine] Triggered by Broadcast Reply for contact ${contactId}`);
            }
        }

        if (flowRes.rows.length > 0) {
            const flow = flowRes.rows[0];
            nodes = flow.nodes;
            edges = flow.edges;

            console.log(`[FlowEngine] Starting Flow: ${flow.name} (${flow.id})`);

            const startNode = nodes.find(n => n.type === 'start');
            if (!startNode) return { handled: false };

            const insertRes = await pool.query(
                `INSERT INTO flow_sessions (flow_id, contact_id, whatsapp_session_id, current_node_id, status)
                 VALUES ($1, $2, $3, $4, 'active') RETURNING id`,
                [flow.id, contactId, dbSessionId, startNode.id]
            );
            const sessionId = insertRes.rows[0].id;

            console.log(`[FlowEngine] Session ${sessionId} Started. Moving from Start.`);

            await moveNext(sessionId, startNode.id, nodes, edges, gatewaySessionId, senderPhone, {}, orgId, contactId);
            return { handled: true, type: 'flow' };
        }
    }

    return { handled: false };
};

/**
 * Recursive function to traverse nodes
 */
const moveNext = async (sessionId, currentNodeId, nodes, edges, gatewaySessionId, to, variables, orgId, contactId) => {
    const edge = edges.find(e => e.source === currentNodeId);

    if (!edge) {
        await pool.query("UPDATE flow_sessions SET status = 'completed' WHERE id = $1", [sessionId]);
        return;
    }

    const nextNodeId = edge.target;
    const nextNode = nodes.find(n => n.id === nextNodeId);

    if (!nextNode) {
        console.error(`[FlowEngine] Error: Node ${nextNodeId} not found. Closing session.`);
        await pool.query("UPDATE flow_sessions SET status = 'completed' WHERE id = $1", [sessionId]);
        if (process.env.NODE_ENV === 'development') {
            await waService.sendText(gatewaySessionId, to, `[Error] Flow Node Missing. Session reset.`);
        }
        return;
    }

    await pool.query("UPDATE flow_sessions SET current_node_id = $1 WHERE id = $2", [nextNodeId, sessionId]);

    console.log(`[FlowEngine] Executing Node: ${nextNodeId} (${nextNode.type})`);

    // EXECUTE NODE LOGIC
    switch (nextNode.type) {
        case 'send_message':
        case 'message':
            const msg = replaceVariables(nextNode.data.message, variables);
            console.log(`[FlowEngine] Sending Text: "${msg}" to ${to}`);
            await waService.sendText(gatewaySessionId, to, msg);
            await moveNext(sessionId, nextNodeId, nodes, edges, gatewaySessionId, to, variables, orgId, contactId);
            break;

        case 'check_ongkir':
            try {
                // 1. Get Settings
                const settingsRes = await pool.query("SELECT * FROM ongkir_settings WHERE organization_id = $1", [orgId]);
                if (settingsRes.rows.length === 0 || !settingsRes.rows[0].is_active) {
                    variables[nextNode.data.result_var || 'ongkir_result'] = "Error: Ongkir integration not active.";
                    await moveNext(sessionId, nextNodeId, nodes, edges, gatewaySessionId, to, variables, orgId, contactId);
                    break;
                }
                const settings = settingsRes.rows[0];

                // 2. Prepare Inputs
                const destVar = nextNode.data.destination_var;
                let destination = variables[destVar]; // Could be "Jakarta" or "152"
                const origin = nextNode.data.origin || settings.default_origin_city_id;
                const weight = Number(variables[nextNode.data.weight_var] || nextNode.data.weight) || 1000; // flexible input
                const courier = nextNode.data.courier || 'jne';
                const resultVar = nextNode.data.result_var || 'ongkir_result';

                if (!destination) {
                    variables[resultVar] = "Error: Missing Destination.";
                } else {
                    // Resolve City ID if input is text
                    if (isNaN(destination)) {
                        const foundCity = await rajaongkir.default.findCityByName(settings.rajaongkir_api_key, settings.rajaongkir_account_type, destination);
                        if (foundCity) {
                            destination = foundCity.city_id;
                        } else {
                            destination = null; // City not found
                        }
                    }

                    if (!destination) {
                        variables[resultVar] = `Maaf, kota tujuan tidak ditemukan.`;
                    } else {
                        // 3. Check Cost
                        const result = await rajaongkir.default.checkCost(
                            settings.rajaongkir_api_key,
                            settings.rajaongkir_account_type,
                            {
                                origin: origin,
                                destination: destination,
                                weight: weight,
                                courier: courier.toLowerCase()
                            }
                        );

                        // 4. Format Output
                        // Result structure: { rajaongkir: { results: [ { costs: [...] } ] } }
                        const costs = result?.rajaongkir?.results?.[0]?.costs;

                        if (!costs || costs.length === 0) {
                            variables[resultVar] = "Maaf, ongkir tidak ditemukan / rute tidak tersedia.";
                        } else {
                            const lines = costs.map(c => {
                                const costVal = c.cost[0].value;
                                const etd = c.cost[0].etd ? `(${c.cost[0].etd} hari)` : '';
                                return `- ${c.service}: Rp ${Number(costVal).toLocaleString('id-ID')} ${etd}`;
                            });
                            variables[resultVar] = `*Ongkir ${courier.toUpperCase()}*\n(Berat: ${weight}g)\n\n` + lines.join('\n');
                        }
                    }
                }

                // Update variables in DB
                await pool.query('UPDATE flow_sessions SET variables = $1 WHERE id = $2', [variables, sessionId]);
            } catch (err) {
                console.error("Check Ongkir Error:", err);
                const resVar = nextNode.data.result_var || 'ongkir_result';
                variables[resVar] = "Error system checking ongkir.";
                await pool.query('UPDATE flow_sessions SET variables = $1 WHERE id = $2', [variables, sessionId]);
            }
            await moveNext(sessionId, nextNodeId, nodes, edges, gatewaySessionId, to, variables, orgId, contactId);
            break;

        case 'send_media':
            const mediaCaption = replaceVariables(nextNode.data.caption || '', variables);
            const mediaUrl = nextNode.data.media_url;
            if (mediaUrl) {
                const fullUrl = mediaUrl.startsWith('http') ? mediaUrl : `${process.env.APP_URL}${mediaUrl}`;
                await waService.sendMedia(gatewaySessionId, to, fullUrl, mediaCaption);
            }
            await moveNext(sessionId, nextNodeId, nodes, edges, gatewaySessionId, to, variables, orgId, contactId);
            break;

        case 'ask_question':
        case 'question':
            const qMsg = replaceVariables(nextNode.data.question, variables);
            if (nextNode.data.use_buttons && (nextNode.data.btn1 || nextNode.data.btn2 || nextNode.data.btn3)) {
                const buttons = [];
                if (nextNode.data.btn1) buttons.push({ id: 'btn1', text: nextNode.data.btn1 });
                if (nextNode.data.btn2) buttons.push({ id: 'btn2', text: nextNode.data.btn2 });
                if (nextNode.data.btn3) buttons.push({ id: 'btn3', text: nextNode.data.btn3 });

                // Check channel
                const convRes = await pool.query("SELECT channel FROM conversations WHERE contact_id = $1 ORDER BY created_at DESC LIMIT 1", [contactId]);
                const channel = convRes.rows.length > 0 ? convRes.rows[0].channel : 'whatsapp';

                if (channel === 'whatsapp') {
                    await waService.sendButtons(gatewaySessionId, to, qMsg, "Please select an option", buttons);
                } else {
                    // Fallback
                    const fallbackText = `${qMsg}\n\n${buttons.map((b, i) => `${i + 1}. ${b.text}`).join('\n')}\n\n*(Balas dengan angka atau teks)*`;
                    
                    if (channel === 'telegram') {
                        const { default: TelegramService } = await import('./TelegramService.js');
                        // Need token, but we only have gatewaySessionId which might be the token for TG
                        await TelegramService.sendMessage(gatewaySessionId, to, fallbackText);
                    } else if (channel === 'instagram') {
                        const { default: InstagramService } = await import('./InstagramService.js');
                        await InstagramService.sendMessage(gatewaySessionId, to, fallbackText);
                    } else if (channel === 'messenger') {
                        const { default: MessengerService } = await import('./MessengerService.js');
                        await MessengerService.sendMessage(gatewaySessionId, to, fallbackText);
                    } else {
                        // generic fallback
                        await waService.sendText(gatewaySessionId, to, fallbackText); // will fail if waService, but keep as ultimate fallback
                    }
                }
            } else {
                // Determine channel to send text
                const convRes = await pool.query("SELECT channel FROM conversations WHERE contact_id = $1 ORDER BY created_at DESC LIMIT 1", [contactId]);
                const channel = convRes.rows.length > 0 ? convRes.rows[0].channel : 'whatsapp';
                
                if (channel === 'telegram') {
                    const { default: TelegramService } = await import('./TelegramService.js');
                    await TelegramService.sendMessage(gatewaySessionId, to, qMsg);
                } else if (channel === 'instagram') {
                    const { default: InstagramService } = await import('./InstagramService.js');
                    await InstagramService.sendMessage(gatewaySessionId, to, qMsg);
                } else if (channel === 'messenger') {
                    const { default: MessengerService } = await import('./MessengerService.js');
                    await MessengerService.sendMessage(gatewaySessionId, to, qMsg);
                } else {
                    await waService.sendText(gatewaySessionId, to, qMsg);
                }
            }
            break;

        case 'condition':
            const varName = nextNode.data.variable;
            const operator = nextNode.data.operator;
            const value = nextNode.data.value;
            const userVal = variables[varName] || '';

            let isTrue = false;
            if (operator === 'equals') isTrue = userVal.toLowerCase() === value.toLowerCase();
            if (operator === 'contains') isTrue = userVal.toLowerCase().includes(value.toLowerCase());

            const trueEdge = edges.find(e => e.source === nextNodeId && (e.sourceHandle === 'true' || e.sourceHandle === 'yes'));
            const falseEdge = edges.find(e => e.source === nextNodeId && (e.sourceHandle === 'false' || e.sourceHandle === 'no'));

            const targetEdge = isTrue ? trueEdge : falseEdge;

            if (targetEdge) {
                await processNode(sessionId, targetEdge.target, nodes, edges, gatewaySessionId, to, variables, orgId, contactId);
            } else {
                await pool.query("UPDATE flow_sessions SET status = 'completed' WHERE id = $1", [sessionId]);
            }
            break;

        case 'trigger_service':
        case 'action':
            // TERMINATE FLOW SESSION and Handover
            await pool.query("UPDATE flow_sessions SET status = 'completed' WHERE id = $1", [sessionId]);

            const service = nextNode.data.service;

            if (service === 'chat_form' && nextNode.data.target_id) {
                // Find form by ID
                const formRes = await pool.query('SELECT * FROM forms WHERE id = $1', [nextNode.data.target_id]);
                if (formRes.rows.length > 0) {
                    const form = formRes.rows[0];
                    // Find DB Session ID for the gateway ID (if exists)
                    const sessionRes = await pool.query('SELECT id FROM whatsapp_sessions WHERE session_id = $1', [gatewaySessionId]);
                    const dbSessId = sessionRes.rows.length > 0 ? sessionRes.rows[0].id : null;

                    // Trigger Form (Mocking as if user typed keyword)
                    // We call startSession logic inside formService, but we need to expose it or call logic manually
                    // Better: Use formService public method
                    // Re-use handleIncomingMessage logic but skip keyword check? 
                    // formService doesn't have a direct 'startFormById' public method yet in previous impl, 
                    // but we can simulate incoming message with keyword to trigger it, OR implement direct start.

                    // For robustness, let's just assume we can insert session directly similar to formService.
                    // NOTE: We need to duplicate startSession logic here or export it from formService.
                    // Assuming we can access formService.startSession (we need to export it in formService.js!)

                    // Since we can't change formService easily here without full file rewrite, let's simulate message:
                    // But wait, `formService.handleIncomingMessage` checks keyword.
                    // Better: Send the keyword as a "fake" message from user? No.
                    // Best: Just send the first question of the form directly and create form session.

                    await pool.query(
                        `INSERT INTO form_sessions (form_id, contact_id, whatsapp_session_id, current_step_index, answers, status)
                          VALUES ($1, $2, $3, 0, '{}', 'active')`,
                        [form.id, contactId, dbSessId]
                    );
                    const firstQ = form.steps[0].question;
                    await waService.sendText(gatewaySessionId, to, `[FORM: ${form.name}]\n\n${firstQ}`);
                }
            }
            else if (service === 'handover_ai') {
                await pool.query("UPDATE conversations SET is_chatbot_active = true WHERE contact_id = $1 AND organization_id = $2", [contactId, orgId]);
                await waService.sendText(gatewaySessionId, to, "🤖 AI Assistant activated.");
            }
            else if (service === 'handover_human') {
                const convRes = await pool.query(
                    "UPDATE conversations SET is_chatbot_active = false, status = 'needs_agent' WHERE contact_id = $1 AND organization_id = $2 RETURNING id, channel", 
                    [contactId, orgId]
                );
                
                if (convRes.rows.length > 0) {
                    try {
                        const { autoAssignConversation } = await import('../controllers/inboxSettingsController.js');
                        await autoAssignConversation(orgId, convRes.rows[0].id, null, 'CS', convRes.rows[0].channel);
                    } catch (err) {
                        console.error('[FlowEngine] Error auto-assigning handed over chat:', err);
                    }
                }
            }
            break;

        case 'delay':
            const amt = parseInt(nextNode.data.delay_amount || nextNode.data.duration) || 0;
            const unit = nextNode.data.delay_unit || nextNode.data.unit || 'minutes';
            
            await pool.query(
                `UPDATE flow_sessions SET status = 'sleeping', resume_at = NOW() + INTERVAL '${amt} ${unit}' WHERE id = $1`,
                [sessionId]
            );
            return; // Terminate execution; Cron will resume later

        case 'add_label':
            if (nextNode.data.label_id) {
                await pool.query(
                    `INSERT INTO contact_labels (contact_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [contactId, nextNode.data.label_id]
                );
            }
            await moveNext(sessionId, nextNodeId, nodes, edges, gatewaySessionId, to, variables, orgId, contactId);
            break;

        case 'webhook':
            const method = nextNode.data.method || 'GET';
            const url = replaceVariables(nextNode.data.url, variables);
            const payloadStr = replaceVariables(nextNode.data.payload, variables);
            const resVar = nextNode.data.result_var || 'api_result';
            
            if (url) {
                try {
                    const axios = (await import('axios')).default;
                    let apiRes;
                    if (method === 'POST') {
                        let parsedPayload = {};
                        try { parsedPayload = JSON.parse(payloadStr); } catch (e) {}
                        apiRes = await axios.post(url, parsedPayload);
                    } else {
                        apiRes = await axios.get(url);
                    }
                    variables[resVar] = typeof apiRes.data === 'object' ? JSON.stringify(apiRes.data) : String(apiRes.data);
                } catch (err) {
                    variables[resVar] = `Error: ${err.message}`;
                }
                await pool.query('UPDATE flow_sessions SET variables = $1 WHERE id = $2', [variables, sessionId]);
            }
            await moveNext(sessionId, nextNodeId, nodes, edges, gatewaySessionId, to, variables, orgId, contactId);
            break;
    }
};

const processNode = async (sessionId, nodeId, nodes, edges, gatewaySessionId, to, variables, orgId, contactId) => {
    // This helper jumps to a node and executes it (wrapper for recursion)
    // We use moveNext logic but need to update pointer first
    // Actually, reusing moveNext logic is cleaner if we just call moveNext but we need to pretend we *arrived* at nodeId
    // Refactored: The switch case above handles execution. We just need to trigger it for the specific node.

    // Update DB pointer to the target node
    await pool.query("UPDATE flow_sessions SET current_node_id = $1 WHERE id = $2", [nodeId, sessionId]);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Execute logic for the target node immediately (recursive)
    // We copy the switch logic or refactor 'executeNode' function. 
    // For brevity in XML, I'll just call moveNext recursively but treating 'nodeId' as the 'current' one requires 
    // logic adjustment because moveNext finds *outgoing* edge.
    // So we need to execute the *action* of the node we landed on, THEN call moveNext.

    // EXECUTE ACTION OF TARGET NODE
    switch (node.type) {
        case 'send_message':
        case 'message':
            const msg = replaceVariables(node.data.message, variables);
            await waService.sendText(gatewaySessionId, to, msg);
            await moveNext(sessionId, nodeId, nodes, edges, gatewaySessionId, to, variables, orgId, contactId);
            break;
        case 'send_media':
            const mediaUrl = node.data.media_url;
            const caption = replaceVariables(node.data.caption || '', variables);
            if (mediaUrl) {
                const fullUrl = mediaUrl.startsWith('http') ? mediaUrl : `${process.env.APP_URL}${mediaUrl}`;
                await waService.sendMedia(gatewaySessionId, to, fullUrl, caption);
            }
            await moveNext(sessionId, nodeId, nodes, edges, gatewaySessionId, to, variables, orgId, contactId);
            break;
        case 'ask_question':
        case 'question':
            const qMsg2 = replaceVariables(node.data.question, variables);
            if (node.data.use_buttons && (node.data.btn1 || node.data.btn2 || node.data.btn3)) {
                const buttons = [];
                if (node.data.btn1) buttons.push({ id: 'btn1', text: node.data.btn1 });
                if (node.data.btn2) buttons.push({ id: 'btn2', text: node.data.btn2 });
                if (node.data.btn3) buttons.push({ id: 'btn3', text: node.data.btn3 });

                // Check channel
                const convRes2 = await pool.query("SELECT channel FROM conversations WHERE contact_id = $1 ORDER BY created_at DESC LIMIT 1", [contactId]);
                const channel2 = convRes2.rows.length > 0 ? convRes2.rows[0].channel : 'whatsapp';

                if (channel2 === 'whatsapp') {
                    await waService.sendButtons(gatewaySessionId, to, qMsg2, "Please select an option", buttons);
                } else {
                    // Fallback
                    const fallbackText2 = `${qMsg2}\n\n${buttons.map((b, i) => `${i + 1}. ${b.text}`).join('\n')}\n\n*(Balas dengan angka atau teks)*`;
                    
                    if (channel2 === 'telegram') {
                        const { default: TelegramService } = await import('./TelegramService.js');
                        await TelegramService.sendMessage(gatewaySessionId, to, fallbackText2);
                    } else if (channel2 === 'instagram') {
                        const { default: InstagramService } = await import('./InstagramService.js');
                        await InstagramService.sendMessage(gatewaySessionId, to, fallbackText2);
                    } else if (channel2 === 'messenger') {
                        const { default: MessengerService } = await import('./MessengerService.js');
                        await MessengerService.sendMessage(gatewaySessionId, to, fallbackText2);
                    } else {
                        // generic fallback
                        await waService.sendText(gatewaySessionId, to, fallbackText2); 
                    }
                }
            } else {
                // Determine channel to send text
                const convRes2 = await pool.query("SELECT channel FROM conversations WHERE contact_id = $1 ORDER BY created_at DESC LIMIT 1", [contactId]);
                const channel2 = convRes2.rows.length > 0 ? convRes2.rows[0].channel : 'whatsapp';
                
                if (channel2 === 'telegram') {
                    const { default: TelegramService } = await import('./TelegramService.js');
                    await TelegramService.sendMessage(gatewaySessionId, to, qMsg2);
                } else if (channel2 === 'instagram') {
                    const { default: InstagramService } = await import('./InstagramService.js');
                    await InstagramService.sendMessage(gatewaySessionId, to, qMsg2);
                } else if (channel2 === 'messenger') {
                    const { default: MessengerService } = await import('./MessengerService.js');
                    await MessengerService.sendMessage(gatewaySessionId, to, qMsg2);
                } else {
                    await waService.sendText(gatewaySessionId, to, qMsg2);
                }
            }
            break;
        // Condition chaining (nested if)
        case 'condition':
            // Evaluate condition immediately
            const varName = node.data.variable;
            const operator = node.data.operator;
            const value = node.data.value;
            const userVal = variables[varName] || '';
            let isTrue = false;
            if (operator === 'equals') isTrue = userVal.toLowerCase() === value.toLowerCase();
            if (operator === 'contains') isTrue = userVal.toLowerCase().includes(value.toLowerCase());

            const trueEdge2 = edges.find(e => e.source === nodeId && (e.sourceHandle === 'true' || e.sourceHandle === 'yes'));
            const falseEdge2 = edges.find(e => e.source === nodeId && (e.sourceHandle === 'false' || e.sourceHandle === 'no'));
            const targetEdge2 = isTrue ? trueEdge2 : falseEdge2;

            if (targetEdge2) await processNode(sessionId, targetEdge2.target, nodes, edges, gatewaySessionId, to, variables, orgId, contactId);
            else await pool.query("UPDATE flow_sessions SET status = 'completed' WHERE id = $1", [sessionId]);
            break;
        case 'trigger_service':
        case 'action':
            // Execute service logic (Copy from above switch)
            await pool.query("UPDATE flow_sessions SET status = 'completed' WHERE id = $1", [sessionId]);
            if (node.data.service === 'handover_human') {
                const convRes = await pool.query(
                    "UPDATE conversations SET is_chatbot_active = false, status = 'needs_agent' WHERE contact_id = $1 RETURNING id, channel", 
                    [contactId]
                );
                
                if (convRes.rows.length > 0) {
                    try {
                        const { autoAssignConversation } = await import('../controllers/inboxSettingsController.js');
                        await autoAssignConversation(orgId, convRes.rows[0].id, null, 'CS', convRes.rows[0].channel);
                    } catch (err) {
                        console.error('[FlowEngine] Error auto-assigning handed over chat:', err);
                    }
                }
            }
            break;

        case 'delay':
            const amt2 = parseInt(node.data.delay_amount || node.data.duration) || 0;
            const unit2 = node.data.delay_unit || node.data.unit || 'minutes';
            await pool.query(
                `UPDATE flow_sessions SET status = 'sleeping', resume_at = NOW() + INTERVAL '${amt2} ${unit2}' WHERE id = $1`,
                [sessionId]
            );
            return;

        case 'add_label':
            if (node.data.label_id) {
                await pool.query(
                    `INSERT INTO contact_labels (contact_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [contactId, node.data.label_id]
                );
            }
            await moveNext(sessionId, nodeId, nodes, edges, gatewaySessionId, to, variables, orgId, contactId);
            break;

        case 'webhook':
            const method2 = node.data.method || 'GET';
            const url2 = replaceVariables(node.data.url, variables);
            const payloadStr2 = replaceVariables(node.data.payload, variables);
            const resVar2 = node.data.result_var || 'api_result';
            
            if (url2) {
                try {
                    const axios = (await import('axios')).default;
                    let apiRes;
                    if (method2 === 'POST') {
                        let parsedPayload = {};
                        try { parsedPayload = JSON.parse(payloadStr2); } catch (e) {}
                        apiRes = await axios.post(url2, parsedPayload);
                    } else {
                        apiRes = await axios.get(url2);
                    }
                    variables[resVar2] = typeof apiRes.data === 'object' ? JSON.stringify(apiRes.data) : String(apiRes.data);
                } catch (err) {
                    variables[resVar2] = `Error: ${err.message}`;
                }
                await pool.query('UPDATE flow_sessions SET variables = $1 WHERE id = $2', [variables, sessionId]);
            }
            await moveNext(sessionId, nodeId, nodes, edges, gatewaySessionId, to, variables, orgId, contactId);
            break;
    }
};

const replaceVariables = (text, vars) => {
    if (!text) return '';
    let res = text;
    for (const [key, val] of Object.entries(vars)) {
        res = res.replace(new RegExp(`{${key}}`, 'g'), val);
    }
    return res;
};