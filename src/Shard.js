// This file is the entry point for Shard processes.

const DiscordBot = require('./DiscordBot')
const startTime = new Date();

// Instantiate the bot.
let discordBot = new DiscordBot();

// Listen for when we need to globally update a member
// from the Update Server.
process.on('message', msg => {
    if (msg.action === 'globallyUpdateMember') {
        discordBot.globallyUpdateMember(msg.argument);
    }
});

// Max shard life time (2 hours)
setTimeout( () => {
    process.exit();
}, 2 * 60 * 60 * 1000);