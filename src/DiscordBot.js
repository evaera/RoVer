const path          = require('path')
const Discord       = require('discord.js-commando')
const request       = require('request-promise')
const config        = require('./data/client.json')
const DiscordServer = require('./DiscordServer')

module.exports =
// The main Discord bot class, only one per shard.
class DiscordBot {
    constructor() {
        this.initialize();
        this.servers = {};
    }

    // Initialize the bot, hook up events, and log in.
    initialize() {
        this.bot = new Discord.Client({
            shardId: parseInt(process.env.SHARD_ID, 10),
            shardCount: parseInt(process.env.SHARD_COUNT, 10),
            apiRequestMethod: config.apiRequestMethod || 'sequential',
            disabledEvents: ['TYPING_START', 'VOICE_STATE_UPDATE', 'PRESENCE_UPDATE', 'MESSAGE_DELETE', 'MESSAGE_UPDATE'],
            owner: config.owner || '0',
            commandPrefix: config.commandPrefix || '!',
            unknownCommandResponse: false
        });

        // Set a reference to this instance inside of the client
        // for use in Commando modules. Is this bad? Probably.
        this.bot.discordBot = this;

        // Events

        // We use .bind(this) so that the context remains within
        // the class and not the event.
        this.bot.on("ready", this.ready.bind(this));
        this.bot.on("guildMemberAdd", this.guildMemberAdd.bind(this));
        if (config.loud) this.bot.on("error", (message) => console.log(message));

        // Only hook up if lockNicknames mode is enabled.
        if (config.lockNicknames) {
            this.bot.on("message", this.message.bind(this));
        }
        
        // Register commands
        this.bot.registry
            .registerGroup('rover', 'RoVer')
            .registerDefaultTypes()
            .registerDefaultGroups()
            .registerDefaultCommands({
                ping: false,
                commandState: false,
                prefix: false,
                help: false
            })
            .registerCommandsIn(path.join(__dirname, 'commands'));

        // Login.
        this.bot.login(process.env.CLIENT_TOKEN);
    }

    // Called when the bot is ready and has logged in.
    ready() {
        console.log(`Shard ${process.env.SHARD_ID} is ready, serving ${this.bot.guilds.array().length} guilds.`);
        this.bot.user.setGame("http://eryn.io/RoVer");
    }

    // This method is called when a user sends a message, but it's used
    // for setting their nickname back to what it should be if they've
    // changed it. Only active if lockNicknames is true in config.
    async message(message) {
        // Don't want to do anything if this is a DM or message was sent by the bot itself.
        if (!message.guild || message.author.id === this.bot.user.id) {
            return;
        }

        // We call discordMember.verify but we want to retain the cache
        // and we don't want it to post any announcements.
        let server = await this.getServer(message.guild.id);
        let member = await server.getMember(message.author.id);
        if (!member) return;
        await member.verify({
            announce: false,
            clearBindingsCache: false
        });
    }

    // This is called when a user joins any Discord server.
    async guildMemberAdd(member) {
        let server = await this.getServer(member.guild.id);
        let discordMember = await server.getMember(member.id);
        if (!member) return;
        let action = await discordMember.verify();

        if (action.status) {
            member.send(server.getWelcomeMessage(action));
        } else {
            member.send("Welcome! Visit the following link to verify your Roblox account: https://verify.eryn.io");
        }
    }

    // This is used to get the DiscordServer instance associated
    // with the specific guild id.
    async getServer(id) {
        if (!this.servers[id]) {
            this.servers[id] = new DiscordServer(this, id);
            await this.servers[id].loadSettings();
        }
        return this.servers[id];
    }

    // This is called by the update server when a user verifies 
    // online. It updates the member in every DiscordServer they
    // are in. 
    async globallyUpdateMember(id) {
        // Start off by clearing their global cache.
        DiscordServer.clearMemberCache(id);

        let firstRun = true;
        
        // Iterate through all of the guilds the bot is in.
        for (let guild of this.bot.guilds.array()) {
            let server = await this.getServer(guild.id);

            if (firstRun) {
                // This only runs on the first iteration. We do this so that
                // we have time to cache the user information, so it only
                // sends out the request once. 

                let member = await server.getMember(id);
                if (!member) continue;
                let action = await member.verify({
                    // We want to clear the group rank bindings cache because
                    // this is the first iteration.
                    clearBindingsCache: true,
                    announce: false
                });

                if (!action.status && !action.nonFatal) {
                    // If there's a fatal error, don't continue with the rest.
                    break;
                } else if (server.hasCustomWelcomeMessage()) {
                    // It worked, checking if there's a custom welcome message.
                    await this.bot.fetchUser(id);
                    
                    let member = await this.bot.guilds.get(guild.id).fetchMember(id);
                    member.send(server.getWelcomeMessage(action));
                }
            } else {
                // This is for all bit the first iteration.

                // We define an inline function and call it with the current
                // context so that we can run these commands synchronously
                // but still execute the requests all at the same time.
                (async function(){
                    let member = await server.getMember(id);
                    if (!member) return;
                    let action = await member.verify({
                        clearBindingsCache: false,
                        announce: false
                    });

                    if (action.status && server.hasCustomWelcomeMessage()) {
                        await this.bot.fetchUser(id);
                        
                        let member = await this.bot.guilds.get(guild.id).fetchMember(id);
                        member.send(server.getWelcomeMessage(action));
                    }
                }).apply(this);
            }
            firstRun = false;
        }
    }
}