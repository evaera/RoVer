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
            let action = await this.getServer(msg.guild.id).verifyMember(msg.author.id);

            if (!action.status) {
                msg.reply(action.error);
            } else {
                msg.reply(`Welcome to the server, ${action.robloxUsername}!`);
            }
        }else if (msg.guild && msg.member.hasPermission('ADMINISTRATOR')) {
            let command = msg.cleanContent.toLowerCase().split(' ')[0];

            let args = msg.cleanContent.split(' ');
            args.shift();
            let argument = args.join(' ');

            let server = this.getServer(msg.guild.id);

            if (command === "!rover") {
                msg.reply("**RoVer Admin Commands:**\n\n`!RoVerVerifiedRole <exact role name>`\n`!RoVerNickname <true|false>`\n`!RoVerAnnounceChannel <exact channel name>`");
            } else if (command === "!roververifiedrole") {
                if (argument.length > 0) {
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
            } else if (command === "!roverannouncechannel") {
                if (argument.length > 0) {
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
            } else if (command === "!rovernickname") {
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
            }
        }
    }

    async guildMemberAdd(member) {
        let action = await this.getServer(member.guild.id).verifyMember(member.id);

        if (action.status) {
            member.send(`Welcome to the server, ${action.robloxUsername}!`);
        }
    }

    getServer(id) {
        if (!this.servers[id]) {
            this.servers[id] = new DiscordServer(this, id);
        }
        return this.servers[id];
    }

    async globallyUpdateMember(id) {
        for (let guild of this.bot.guilds.array()) {
            let server = this.getServer(guild.id);

            let action = await server.verifyMember(id);

            if (!action.status) {
                break;
            }
        }
    }
}