const fetch = require("node-fetch");
const fs = require("fs");

const USERS = [
    { id: process.env.ROBLOX_USER_1, name: "User 1" },
    { id: process.env.ROBLOX_USER_2, name: "User 2" }
];

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

// Load previous state (if exists)
let previousState = {};
if (fs.existsSync("state.json")) {
    previousState = JSON.parse(fs.readFileSync("state.json", "utf8"));
}

async function getPresence(userId) {
    const res = await fetch("https://presence.roblox.com/v1/presence/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [userId] })
    });

    const data = await res.json();
    return data.userPresences[0].userPresenceType; // 0 = offline, 1/2/3 = online
}

async function sendDiscordMessage(msg) {
    await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg })
    });
}

(async () => {
    let newState = {};

    for (const user of USERS) {
        const presence = await getPresence(user.id);
        const wasOnline = previousState[user.id] === 1;
        const isOnline = presence !== 0;

        // Online event (only once)
        if (!wasOnline && isOnline) {
            await sendDiscordMessage(`${user.name} is now **ONLINE**`);
        }

        // Offline event
        if (wasOnline && !isOnline) {
            await sendDiscordMessage(`${user.name} is now **OFFLINE**`);
        }

        newState[user.id] = isOnline ? 1 : 0;
    }

    // Save new state
    fs.writeFileSync("state.json", JSON.stringify(newState));
})();
