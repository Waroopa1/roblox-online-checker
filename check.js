const fetch = require("node-fetch");
const fs = require("fs");

const users = [
  { id: process.env.ROBLOX_USER_1, name: "m" },
  { id: process.env.ROBLOX_USER_2, name: "w" }
];

const webhook = process.env.DISCORD_WEBHOOK;

// Load previous state
let state = {};
if (fs.existsSync("state.json")) {
  state = JSON.parse(fs.readFileSync("state.json"));
}

async function getPresence(userId) {
  const res = await fetch(`https://presence.roblox.com/v1/presence/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds: [userId] })
  });

  const data = await res.json();
  return data.userPresences[0].userPresenceType === 2 ? "online" : "offline";
}

async function sendDiscord(msg) {
  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: msg })
  });
}

(async () => {
  let message = "**5‑Minute Status Update**\n";

  for (const user of users) {
    const currentStatus = await getPresence(user.id);
    const prev = state[user.id] || {
      status: "offline",
      lastChange: Date.now()
    };

    const now = Date.now();
    const minutes = Math.floor((now - prev.lastChange) / 60000);

    // If status changed → send alert
    if (currentStatus !== prev.status) {
      if (currentStatus === "online") {
        await sendDiscord(`${user.name} is now **ONLINE** (was offline for ${minutes} minutes)`);
      } else {
        await sendDiscord(`${user.name} is now **OFFLINE** (was online for ${minutes} minutes)`);
      }

      // Reset timer
      state[user.id] = {
        status: currentStatus,
        lastChange: now
      };
    } else {
      // No change → just update uptime counter
      state[user.id] = {
        status: currentStatus,
        lastChange: prev.lastChange
      };
    }

    // Add to the 5‑minute summary message
    message += `• **${user.name}**: ${currentStatus.toUpperCase()} for ${minutes} minutes\n`;
  }

  // Send the 5‑minute summary
  await sendDiscord(message);

  // Save state
  fs.writeFileSync("state.json", JSON.stringify(state));
})();
