const net = require('net');
const { Client, GatewayIntentBits } = require('discord.js');  // Updated import

const danny = new Client({
    intents: [
        GatewayIntentBits.Guilds,                 // For guild-related events and interactions
        GatewayIntentBits.GuildMessages,          // For message-related events
        GatewayIntentBits.GuildMessageReactions,  // For reaction-related events
        GatewayIntentBits.GuildMembers,           // For member-related events
        GatewayIntentBits.DirectMessages,         // For handling direct messages
    ],
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'], // For handling uncached events
});

var rconClient;

async function RCONcom(com) {
    if (rconClient && com) {
        rconClient.write(com + '\n'); // Send the RCON command with newline
    }
}

danny.on('ready', () => {
    console.log("RCON_BOT_ONLINE");

    rconClient = new net.Socket();
    rconClient.connect(PORT, 'IP_ADDRESS', () => {
        console.log("Connected to RCON server");
        rconClient.write('<md5sum_passhere>\n'); // Make sure this is the correct password format
    });

    rconClient.on('data', (data) => {
        console.log("Data received:", data.toString());
        if (data.length > 5) {
            danny.channels.cache.get("1280470870929707070").send(`${data.toString()}`);
        }
    });

    rconClient.on('error', (err) => {
        console.error("Error with RCON client:", err);
    });
});

danny.on('messageCreate', (msg) => {
    if (msg.channel.id === "1324516126595612695" && msg.content.toLowerCase().startsWith("r.")) {
        const command = msg.content.split(".")[1];
        if (command) {
            RCONcom(command);
        } else {
            msg.reply("No command provided.");
        }
    }
});

danny.login('TOKEN');
