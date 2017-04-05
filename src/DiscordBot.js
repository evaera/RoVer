const Discord       = require('discord.js')
const request       = require('request-promise')
const config        = require('./data/client.json')
const DiscordServer = require('./DiscordServer')

module.exports = 

class DiscordBot {
    constructor() {
        this.initialize();
        this.servers = {};
    }

    initialize() {
        this.bot = new Discord.Client();

        this.bot.on("ready", this.ready.bind(this));
        this.bot.on("message", this.message.bind(this));
        this.bot.on("guildMemberAdd", this.guildMemberAdd.bind(this));

        this.bot.login(config.token);
    }

    ready() {
        console.log("RoVer is ready.");
        this.bot.user.setGame("http://eryn.io/RoVer");
    }

    async message(msg) {
        if (msg.content.toLowerCase() === "!verify" && msg.guild) {
            DiscordServer.clearMemberCache(msg.author.id);

            let server = this.getServer(msg.guild.id)
            let action = await server.verifyMember(msg.author.id);

            if (!action.status) {
                msg.reply(action.error);
            } else {
                msg.reply(server.getWelcomeMessage(action));
            }
        }else if (msg.guild && msg.member && msg.member.hasPermission('ADMINISTRATOR')) {
            let command = msg.cleanContent.toLowerCase().split(' ')[0];

            let args = msg.cleanContent.split(' ');
            args.shift();
            let argument = args.join(' ');

            let server = this.getServer(msg.guild.id);

            switch (command) {
                case "!rover":
                    msg.reply("**RoVer Admin Commands:**\n\n`!RoVerVerifiedRole <exact role name>` - Set the role that users get when they are verified.\n`!RoVerNickname <true|false>` - Choose whether or not the bot changes nicknames.\n`!RoVerAnnounceChannel <exact channel name>` - A channel where the bot will announce new verifications, useful for admins.\n`!RoVerNicknameFormat <format>` - sets the nickname format. Available replacements are `%USERNAME%`, `%USERID%`, `%DISCORDNAME%`, and `%DISCORDID%`\n`!RoVerWelcomeMessage <welcome message>` - Set the message the user gets when they verify. Same format as above.");
                    break;
                case "!roververifiedrole":
                    if (argument.length > 0) {
                        if (argument.startsWith("@")) {
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
            }
        }
    }

    async guildMemberAdd(member) {
        let server = this.getServer(member.guild.id);
        let action = await server.verifyMember(member.id);

        if (action.status) {
            member.send(server.getWelcomeMessage(action));
        } else {
            member.send("Welcome! Visit the following link to verify your Roblox account: https://verify.eryn.io");
        }
    }

    getServer(id) {
        if (!this.servers[id]) {
            this.servers[id] = new DiscordServer(this, id);
        }
        return this.servers[id];
    }

    async globallyUpdateMember(id) {
        DiscordServer.clearMemberCache(id);

        for (let guild of this.bot.guilds.array()) {
            let server = this.getServer(guild.id);

            let action = await server.verifyMember(id);

            if (!action.status && !action.nonFatal) {
                break;
            } else if (server.hasCustomWelcomeMessage()) {
                let member = await this.bot.guilds.get(guild.id).fetchMember(id);
                member.send(server.getWelcomeMessage(action));
            }
        }
    }
}