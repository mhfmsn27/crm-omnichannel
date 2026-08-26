import { fcmService } from '../src/services/fcmService.js';
import dotenv from 'dotenv';
dotenv.config();

console.log("Testing FCM Service...");

// Mock fcmService.sendMulticast if you want to test logic without credentials
// or rely on the fact that fcmService logs errors gracefully if config is missing.

async function test() {
    console.log("Simulating New Message Notification...");
    // Force some tokens into DB if needed, or just test logic flow
    // For now, we just call the function with dummy data to ensure no crash
    try {
        await fcmService.sendNewMessageNotification(
            1, // Org ID
            null, // Agent ID (Broadcast)
            123, // Conv ID
            "Tester", // Sender
            "Hello from Script", // Message
            null // Media
        );
        console.log("Test function called successfully (Check logs for 'Notification sent' or 'initialized' warnings).");
    } catch (e) {
        console.error("Test function failed:", e);
    }
}

test();
