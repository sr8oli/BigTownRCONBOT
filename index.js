const { Client, Events, Intents, EmbedBuilder, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const DISCORD_TOKEN = "ham";
const CLIENT_ID = "ham";
const GUILD_ID = "ham";  // Optional: Only if you want to register the command in a specific guild
const COUNTING_CHANNEL_ID = "1351034766530580512";
const ALLOWED_ROLE_ID = "1341747093751988284";  // Replace with the ID of the role allowed to use the command

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

let currentCount = 0;

// Reaction role handler
const roleEmojiMapping = {
    "📣": "1351230498491338843", // Replace with the actual role ID and emoji you want
    "🔥": "1351230222002946108", // Replace with the actual role ID and emoji you want
    "🎁": "1351230146857795697", // Example role ID
    "❗": "1351229990947000421", // Example role ID
};

// Send the role panel message
client.once("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // Register slash commands (only once when the bot starts up)
    const commands = [
        new SlashCommandBuilder().setName('clear').setDescription('Deletes a set number of messages')
            .addIntegerOption(option => 
                option.setName('amount')
                    .setDescription('Number of messages to delete')
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(100)), // Limit the amount to delete to 100 messages
        new SlashCommandBuilder().setName('help').setDescription('Displays help information about the bot'),
    ]
        .map(command => command.toJSON());

    const rest = new REST({ version: '9' }).setToken(DISCORD_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands }); // For specific guild
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }

    // Send a message with reactions to assign roles
    const channel = client.channels.cache.get("1351244498998530108"); // Replace with the channel ID
    const roleMessage = await channel.send("React to this message to get a role!");

    // Add reactions to the message
    for (const emoji of Object.keys(roleEmojiMapping)) {
        await roleMessage.react(emoji);
    }
});

// Reaction add/remove event handler
client.on("messageReactionAdd", async (reaction, user) => {
    // Avoid bot reacting to itself
    if (user.bot) return;

    const roleId = roleEmojiMapping[reaction.emoji.name];
    console.log(`Reaction added: ${reaction.emoji.name} by ${user.tag}`);

    if (!roleId) return; // If there's no role for the emoji, exit

    const member = await reaction.message.guild.members.fetch(user.id);

    try {
        await member.roles.add(roleId);
        console.log(`Assigned ${roleId} to ${user.tag}`);
    } catch (error) {
        console.error("Error assigning role:", error);
    }
});

client.on("messageReactionRemove", async (reaction, user) => {
    // Avoid bot reacting to itself
    if (user.bot) return;

    const roleId = roleEmojiMapping[reaction.emoji.name];
    console.log(`Reaction removed: ${reaction.emoji.name} by ${user.tag}`);

    if (!roleId) return; // If there's no role for the emoji, exit

    const member = await reaction.message.guild.members.fetch(user.id);

    try {
        await member.roles.remove(roleId);
        console.log(`Removed ${roleId} from ${user.tag}`);
    } catch (error) {
        console.error("Error removing role:", error);
    }
});

// Existing message handling logic
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.channel.id === COUNTING_CHANNEL_ID) {
        const userNumber = parseInt(message.content, 10);

        if (!isNaN(userNumber)) {
            if (userNumber === currentCount + 1) {
                currentCount = userNumber;
            } else {
                await message.delete();
            }
        } else {
            await message.delete();
        }
    }
});

// Guild member join/leave events
client.on(Events.GuildMemberAdd, async (member) => {
    console.log(`Member joined: ${member.user.tag} (ID: ${member.user.id})`);

    const welcomeChannel = member.guild.channels.cache.get('1341734007347478602');
    const logChannel = member.guild.channels.cache.get("1341775107055423538");

    if (!welcomeChannel) {
        console.log("Welcome channel not found.");
        return;
    }

    const welcomeEmbed = new EmbedBuilder()
        .setColor('#00FF00') // Green for welcoming
        .setTitle(`Welcome to the server!`)
        .setDescription(`A new member has joined! Here's their info:
    **Joined on** | ${member.joinedAt}
    **Username** | ${member.user.username}
    **Tag** | ${member.user.tag}
    **ID** | ${member.user.id}
    **Bot** | ${member.user.bot ? 'Yes' : 'No'}`)
        .setFooter({ text: 'Welcome to the community!' })
        .setTimestamp();

    try {
        await welcomeChannel.send({ embeds: [welcomeEmbed] });
        console.log("Welcome message sent.");
    } catch (err) {
        console.error("Error sending welcome message:", err);
        if (logChannel) {
            await logChannel.send(`Failed to send welcome message: ${err.message}`);
        }
    }
});

client.on(Events.GuildMemberRemove, async (member) => {
    console.log(`Member left: ${member.user.tag} (ID: ${member.user.id})`);

    const logChannel = member.guild.channels.cache.get("1341775107055423538");

    if (!logChannel) return;

    const leaveEmbed = new EmbedBuilder()
        .setColor('#FF0000') // Red for leave
        .setTitle('Member Left')
        .setDescription(`**Username** | ${member.user.username}
    **Tag** | ${member.user.tag}
    **ID** | ${member.user.id}`)
        .setFooter({ text: 'Goodbye!' })
        .setTimestamp();

    try {
        await logChannel.send({ embeds: [leaveEmbed] });
        console.log("Leave message sent.");
    } catch (err) {
        console.error("Error sending leave message:", err);
    }
});

// Handle Slash Command Interaction
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'clear') {
        // Check if the user has the required role
        const member = interaction.guild.members.cache.get(interaction.user.id);
        if (!member || !member.roles.cache.has(ALLOWED_ROLE_ID)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const amount = interaction.options.getInteger('amount'); // Get the number of messages to delete

        if (!amount || amount < 1 || amount > 100) {
            return interaction.reply({ content: 'Please provide a valid number of messages to delete (1-100).', ephemeral: true });
        }

        try {
            const messages = await interaction.channel.messages.fetch({ limit: amount });
            await interaction.channel.bulkDelete(messages);
            return interaction.reply({ content: `${amount} messages deleted!`, ephemeral: true });
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'There was an error while deleting messages!', ephemeral: true });
        }
    }

    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('Help - Bot Commands')
            .setDescription('Here are the available commands:')
            .addFields(
                { name: '/clear', value: 'Deletes a set number of messages. Usage: `/clear <amount>`' },
                { name: '/help', value: 'Displays this help message.' }
            )
            .setFooter({ text: 'Use the commands as needed!' })
            .setTimestamp();

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }
});

client.login(DISCORD_TOKEN);
