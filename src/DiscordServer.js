const path        = require('path')
const fs          = require('fs')
const Discord     = require('discord.js')
const request     = require('request-promise')
const config      = require('./data/client.json')

DefaultSettings = {
    verifiedRole: null,
    nicknameUsers: true,
    announceChannel: null,
    nicknameFormat: "%USERNAME%"
}

module.exports = 

class DiscordServer {
    constructor(discordBot, id) {
        this.id = id;
        this.discordBot = discordBot;
        this.bot = this.discordBot.bot;

        this.server = this.bot.guilds.get(id);

        if (DiscordServer.DataCache == null) {
            DiscordServer.DataCache = {};
        }

        this.settings = {};
        this.settingsPath = path.join(__dirname, "data", `${id}.json`);
        this.loadSettings();
    }

    loadSettings() {
        if (!fs.existsSync(this.settingsPath)) {
            fs.writeFileSync(this.settingsPath, JSON.stringify(DefaultSettings));
        }

        if (!fs.existsSync(this.settingsPath)) {
            throw `Couldn't write settings file: ${this.settingsPath}`;
        }

        let fileData = fs.readFileSync(this.settingsPath);
        
        try {
            this.settings = JSON.parse(fileData);
        } catch (e) {
            console.log(`${this.settingsPath} appears to be corrupted.`);
        }
    }

    getSetting(key) {
        if (typeof this.settings[key] !== 'undefined') {
            return this.settings[key];
        } else if (typeof DefaultSettings[key] !== 'undefined') {
            return DefaultSettings[key];
        } else {
            return null;
        }
    }

    setSetting(key, value) {
        this.settings[key] = value;

        fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings));
    }

    static clearMemberCache(id) {
        if (DiscordServer.DataCache && DiscordServer.DataCache[id]) {
            delete DiscordServer.DataCache[id];
        }
    }

    getMemberNickname(data, member) {
        let formatString = this.getSetting('nicknameFormat');

        let replacements = {
            "%USERNAME%": data.robloxUsername,
            "%USERID%": data.robloxId,
            "%DISCORDNAME%": "",
            "%DISCORDID%": "",
        }

        if (member != null) {
            replacements["%DISCORDNAME%"] = member.user.username;
            replacements["%DISCORDID%"] = member.id;
        }

        return formatString.replace(/%\w+%/g, (all) => {
            return replacements[all] || all;
        });
    }

    async verifyMember(id) {
        let data = {};

        try {
            data = DiscordServer.DataCache[id] || await request({
                uri: `https://verify.eryn.io/api/user/${id}`,
                json: true
            })
        } catch (e) {
            switch (e.response.statusCode){
                case 404:
                    return {
                        status: false,
                        error: "Not verified. Go to https://verify.eryn.io to verify."
                    }
                case 429: 
                    return {
                        status: false,
                        error: "Server is busy. Please try again later."
                    }
                default:
                    return {
                        status: false,
                        error: "Unknown error."
                    }
            }
        }

        if (data.status === "ok"){
            DiscordServer.DataCache[id] = data;

            try {
                let member = await this.server.fetchMember(id);

                if (this.getSetting('nicknameUsers')) {
                    await member.setNickname(this.getMemberNickname(data, member));
                }

                if (this.getSetting('verifiedRole')) {
                    await member.addRole(this.getSetting('verifiedRole'));
                }

                if (this.getSetting('announceChannel')) {
                    let channel = await this.server.channels.get(this.getSetting('announceChannel'));

                    if (channel) {
                        channel.send(`**User verified:** <@${id}> as ${data.robloxUsername}`);
                    }
                }
            } catch (e) {
                return {
                    status: false,
                    nonFatal: true,
                    error: "The bot couldn't modify the member in this server. Either the bot doesn't have permission or the target user cannot be modified by the bot (such as higher rank in the server)."
                }
            }

            return {
                status: true,
                robloxUsername: data.robloxUsername,
                robloxId: data.robloxId
            }
        }
    }
}