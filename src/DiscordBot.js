const Discord       = require('discord.js')
const request       = require('request-promise')
const config        = require('./data/client.json')
const DiscordServer = require('./DiscordServer')

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
            shardCount: parseInt(process.env.SHARD_COUNT, 10)
        });

        // Events

        // We use .bind(this) so that the context remains within
        // the class and not the event.
        this.bot.on("ready", this.ready.bind(this));
        this.bot.on("message", this.message.bind(this));
        this.bot.on("guildMemberAdd", this.guildMemberAdd.bind(this));

        // Only hook up typingStart if lockNicknames mode is enabled.
        if (config.lockNicknames) {
            this.bot.on("typingStart", this.typingStart.bind(this));
        }

        // Login.
        this.bot.login(process.env.CLIENT_TOKEN);
    }

    // Called when the bot is ready and has logged in.
    ready() {
        console.log(`Shard ${process.env.SHARD_ID} is ready, serving ${this.bot.guilds.array().length} guilds.`);
        this.bot.user.setGame("http://eryn.io/RoVer");
    }

    // This method is called when a user starts typing, but it's used
    // for setting their nickname back to what it should be if they've
    // changed it. Only active if lockNicknames is true in config.
    async typingStart(channel, user) {
        // Don't want to do anything if this is a DM.
        if (channel.type !== "text") {
            return;
        }

        // We call verifyMember but we want to retain the cache and we
        // don't want it to post any announcements.
        this.getServer(channel.guild.id).verifyMember(user.id, {
            announce: false,
            clearBindingsCache: false
        });
    }

    // This method is called when the bot can read a message in any
    // channel it's in, even DMs.
    async message(msg) {
        if (msg.content.toLowerCase() === "!verify" && msg.guild) {
            // The user ran `!verify`, we are checking their status now.
            
            // Clear the request cache so we get fresh information.
            DiscordServer.clearMemberCache(msg.author.id);

            let server = this.getServer(msg.guild.id)
            let action = await server.verifyMember(msg.author.id);

            // We reply with the status of the verification in the
            // channel the command was sent.
            if (!action.status) {
                msg.reply(action.error);
            } else {
                msg.reply(server.getWelcomeMessage(action));
            }
        }else if (msg.guild && msg.member && msg.member.hasPermission('ADMINISTRATOR')) {
            // These are admin commands, and only work if the user has
            // the Administrator permission.

            // Get the first word in the message.
            let command = msg.cleanContent.toLowerCase().split(' ')[0];

            // Get the command argument, which is just a string excluding
            // the first word. 
            let args = msg.cleanContent.split(' ');
            args.shift();
            let argument = args.join(' ');

            let server = this.getServer(msg.guild.id);

            switch (command) {
                case "!rover":
                    msg.reply("**RoVer Admin Commands:**\n\n`!RoVerVerifiedRole <exact role name>` - Set the role that users get when they are verified.\n`!RoVerNickname <true|false>` - Choose whether or not the bot changes nicknames.\n`!RoVerAnnounceChannel <exact channel name>` - A channel where the bot will announce new verifications, useful for admins.\n`!RoVerNicknameFormat <format>` - sets the nickname format. Available replacements are `%USERNAME%`, `%USERID%`, `%DISCORDNAME%`, and `%DISCORDID%`\n`!RoVerWelcomeMessage <welcome message>` - Set the message the user gets when they verify. Same format as above.\n`!RoVerBindGroupRank <groupid:rank number:role name|groupid:role name>` - Bind a rank in a group to a role in discord.\n`!RoVerUnbindGroupRank <role name>` - Unbind a group rank binding associated with this role.\n`!RoVerUnbindAllGroupRanks` - Unbind all group ranks in this server.\n`!RoVerUpdate <@targetUser>` - Update a user, same as them running !verify. Make sure you @mention them.");
                    break;
                case "!roververifiedrole":
                    if (argument.length > 0) {
                        if (argument.startsWith("@")) {
                            // Support for role mentions. Since we use cleanContent,
                            // it will just be the role's display name.
                            argument = argument.substring(1);
                        }

                        let role = msg.guild.roles.find('name', argument);
                        if (role) {
                            server.setSetting('verifiedRole', role.id);
                            msg.reply(`Set verified role to ${argument}`);
                        } else {
                            msg.reply(`Couldn't find role \`${argument}\`. Make sure you type it exactly (including capitalization).`);
                        }
                    } else {
                        server.setSetting('verifiedRole', null);
                        msg.reply("Cleared verified role, users will no longer receive a role when they verify.");
                    }
                    break;
                case "!roverannouncechannel":
                     if (argument.length > 0) {
                        if (argument.startsWith("#")) {
                            // Support for channel mentions. Since we use cleanContent,
                            // it will just be the channel's display name.
                            argument = argument.substring(1);
                        }

                        let channel = msg.guild.channels.find('name', argument);

                        if (channel) {
                            server.setSetting('announceChannel', channel.id);
                            msg.reply(`Set verify announcement channel to ${argument}`);
                        } else {
                            msg.reply(`Couldn't find channel \`${argument}\`. Make sure you type it exactly (including capitalization).`);
                        }
                    } else {
                        server.setSetting('announceChannel', null);
                        msg.reply("Verified users will no longer be announced.");
                    }
                    break;
                case "!rovernickname":
                     if (argument.length > 0) {
                        server.setSetting('nicknameUsers', argument === 'true');
                        if (argument === 'true') {
                            msg.reply("The bot will now nickname users to their Roblox username.");
                        } else {
                            msg.reply("The bot will no longer nickname users to their Roblox name.");
                        }
                    } else {
                        msg.reply("Requires argument (true|false)");
                    }
                    break;
                case "!rovernicknameformat":
                     if (argument.length > 0) {
                        server.setSetting('nicknameFormat', argument);
                        msg.reply(`Set nickname format to \`${argument}\``);
                    } else {
                        server.setSetting('nicknameFormat', undefined);
                        msg.reply("Nickname format set back to default");
                    }
                    break;
                case "!roverwelcomemessage":
                    if (argument.length > 0) {
                        server.setSetting('welcomeMessage', argument);
                        msg.reply(`Set welcome message to \`${argument}\``);
                    } else {
                        server.setSetting('welcomeMessage', undefined);
                        msg.reply("Set welcome message back to default");
                    }
                    break;
                case "!roverbindgrouprank":
                    if (argument.length > 0) {
                        let bindArgs = argument.split(':');
                        let binding = {};

                        if (bindArgs.length === 2) {
                            // The user excluded the rank argument.
                            binding.group = bindArgs[0];
                            binding.role = bindArgs[1];
                        } else if (bindArgs.length === 3) {
                            // Rank argument included

                            // Support for operators, so we parse them out before
                            // saving the rank number.
                            let rankUnparsed = bindArgs[1];

                            if (rankUnparsed.startsWith('>')) {
                                binding.operator = 'gt';
                                rankUnparsed = rankUnparsed.substring(1);
                            } else if (rankUnparsed.startsWith('<')) {
                                binding.operator = 'lt';
                                rankUnparsed = rankUnparsed.substring(1);
                            }

                            binding.group = bindArgs[0];
                            binding.rank = parseInt(rankUnparsed, 10);
                            binding.role = bindArgs[2];
                        } else {
                            return msg.reply("Wrong number of arguments: needs 2 or 3");
                        }

                        // Verify that the role the user provided is real.
                        let role = msg.guild.roles.find('name', binding.role);
                        if (role) {
                            binding.role = role.id;
                        } else {
                            return msg(`Couldn't find role: \`${binding.role}\``);
                        }

                        // Delete any previous binding with that role.
                        server.deleteGroupRankBinding(binding.role);

                        // Add the new binding.
                        let serverBindings = server.getSetting('groupRankBindings');
                        serverBindings.push(binding);
                        server.setSetting('groupRankBindings', serverBindings);

                        msg.reply(`Added rank binding: Group: ${binding.group}, Rank: ${binding.rank || 'none'}, Role: ${role.name}, Comparison: ${binding.operator || 'eq'}`);
                    }
                    break;
                case "!roverunbindgrouprank":
                    if (argument.length > 0) {
                        let role = msg.guild.roles.find('name', argument);
                        if (role) {
                            server.deleteGroupRankBinding(role.id);
                            msg.reply(`Cleared all bindings associated to \`${role.name}\``);
                        } else {
                            msg.reply(`Role not found: \`${argument}\``);
                        }
                    }
                    break;
                case "!roverunbindallgroupranks": 
                    server.deleteGroupRankBinding('all');
                    msg.reply("Deleted all group rank bindings.");
                    break;
                case "!roverupdate":
                    if (msg.mentions.users.array().length > 0) {
                        let user = msg.mentions.users.first();
                        DiscordServer.clearMemberCache(user.id);

                        let server = this.getServer(msg.guild.id)
                        let action = await server.verifyMember(user.id);

                        if (!action.status) {
                            msg.reply(action.error);
                        } else {
                            msg.reply(`${action.robloxUsername} verified.`);
                        }
                    }
                    break;
            }
        }
    }

    // This is called when a user joins any Discord server.
    async guildMemberAdd(member) {
        let server = this.getServer(member.guild.id);
        let action = await server.verifyMember(member.id);

        if (action.status) {
            member.send(server.getWelcomeMessage(action));
        } else {
            member.send("Welcome! Visit the following link to verify your Roblox account: https://verify.eryn.io");
        }
    }

    // This is used to get the DiscordServer instance associated
    // with the specific guild id.
    getServer(id) {
        if (!this.servers[id]) {
            this.servers[id] = new DiscordServer(this, id);
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
            let server = this.getServer(guild.id);

            if (firstRun) {
                // This only runs on the first iteration. We do this so that
                // we have time to cache the user information, so it only
                // sends out the request once. 

                let action = await server.verifyMember(id, {
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
                    let action = await server.verifyMember(id, {
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

// Instantiate the bot.
let discordBot = new DiscordBot();

// Listen for when we need to globally update a member
// from the Update Server.
process.on('message', msg => {
    if (msg.action === 'globallyUpdateMember') {
        discordBot.globallyUpdateMember(msg.argument);
    }
});