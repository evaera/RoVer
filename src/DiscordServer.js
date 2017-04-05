const path        = require('path')
const fs          = require('fs')
const Discord     = require('discord.js')
const request     = require('request-promise')
const config      = require('./data/client.json')

DefaultSettings = {
    verifiedRole: null,
    nicknameUsers: true,
    announceChannel: null,
    nicknameFormat: "%USERNAME%",
    welcomeMessage: "Welcome to the server, %USERNAME%!",
    groupRankBindings: []
}

VirtualGroups = {
    DevForum: async (userid) => {
        let userData = {}
        try {
            userData = await request({
                uri: `http://api.roblox.com/users/${userid}`,
                json: true,
                simple: false
            });
        } catch (e) {
            return false;
        }

        let username = userData.Username;

        if (!username) {
            return false;
        }

        let devForumData = {}
        
        try {
            devForumData = await request({
                uri: `http://devforum.roblox.com/users/${username}.json`,
                json: true,
                simple: false
            });
        } catch (e) {
            return false;
        }
        
        if (devForumData.user.trust_level > 0) {
            return true;
        }

        return false;
    }
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
            DiscordServer.BindingsCache = {};
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

    static formatDataString(formatString, data, member) {
        let replacements = {
            "%USERNAME%": data.robloxUsername,
            "%USERID%": data.robloxId,
            "%DISCORDNAME%": data.discordName || "",
            "%DISCORDID%": data.discordId || "",
        }

        if (member != null) {
            replacements["%DISCORDNAME%"] = member.user.username;
            replacements["%DISCORDID%"] = member.id;
        }

        return formatString.replace(/%\w+%/g, (all) => {
            return replacements[all] || all;
        });
    }

    static async resolveGroupRankBinding(binding, userid) {
        if (DiscordServer.BindingsCache[userid] && typeof DiscordServer.BindingsCache[userid][JSON.stringify(binding)] !== 'undefined') {
            return DiscordServer.BindingsCache[userid][JSON.stringify(binding)];
        }

        let returnValue = false;

        try {
            if (VirtualGroups[binding.group]){
                returnValue = VirtualGroups[binding.group](userid);
            } else {
                if (config.loud) {
                    console.log(`https://assetgame.roblox.com/Game/LuaWebService/HandleSocialRequest.ashx?method=GetGroupRank&playerid=${userid}&groupid=${binding.group}`);
                }
                let rank = await request({
                    uri: `https://assetgame.roblox.com/Game/LuaWebService/HandleSocialRequest.ashx?method=GetGroupRank&playerid=${userid}&groupid=${binding.group}`,
                    simple: false
                });
                rank = parseInt(rank.replace(/[^\d]/g, ''), 10);
                
                if (binding.rank) {
                    if ((!binding.operator && rank === binding.rank) || (binding.operator === 'gt' && rank >= binding.rank) || (binding.operator === 'lt' && rank < binding.rank)) {
                        returnValue = true;
                    }
                } else {
                    if (rank > 0) {
                        returnValue = true;
                    }
                }
            }
        } catch (e) {
            console.log("Encountered an error while trying to resolve a rank binding:");
            console.log(binding);
        }
        
        if (!DiscordServer.BindingsCache[userid]) {
            DiscordServer.BindingsCache[userid] = {};
        }

        DiscordServer.BindingsCache[userid][JSON.stringify(binding)] = returnValue;

        return returnValue;
    }

    deleteGroupRankBinding(roleid) {
        let rankBindings = this.getSetting('groupRankBindings');

        for (var i=0; i < rankBindings.length; i++) {
            let binding = rankBindings[i];

            if (binding.role === roleid || roleid === 'all') {
                rankBindings.splice(i, 1);
            }
        }
        
        this.setSetting('groupRankBindings', rankBindings);
    }

    getMemberNickname(data, member) {
        return DiscordServer.formatDataString(this.getSetting('nicknameFormat'), data, member)
    }

    getWelcomeMessage(data) {
        return DiscordServer.formatDataString(this.getSetting('welcomeMessage'), data);
    }
    
    hasCustomWelcomeMessage() {
        return DefaultSettings.welcomeMessage !== this.getSetting('welcomeMessage');
    }

    async verifyMember(id, options) {
        var options = options || {};
        let data = {};
        let member;

        try {
            if (config.loud) {
                console.log(`https://verify.eryn.io/api/user/${id}`);
            }
            data = DiscordServer.DataCache[id] || await request({
                uri: `https://verify.eryn.io/api/user/${id}`,
                json: true,
                simple: false
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
                member = await this.server.fetchMember(id);

                if (this.getSetting('nicknameUsers')) {
                    await member.setNickname(this.getMemberNickname(data, member));
                }

                if (this.getSetting('verifiedRole')) {
                    await member.addRole(this.getSetting('verifiedRole'));
                }

                if (this.getSetting('announceChannel') && options.announce !== false) {
                    let channel = await this.server.channels.get(this.getSetting('announceChannel'));

                    if (channel) {
                        channel.send(`**User verified:** <@${id}> as ${data.robloxUsername}`);
                    }
                }

                if (options.clearBindingsCache !== false) {
                    DiscordServer.BindingsCache[data.robloxId] = {};
                }

                if (this.getSetting('groupRankBindings').length > 0) {
                    for (let binding of this.getSetting('groupRankBindings')) {
                        DiscordServer.resolveGroupRankBinding(binding, data.robloxId)
                            .then((state) => {
                                if (state === true) {
                                    member.addRole(binding.role);
                                } else {
                                    member.removeRole(binding.role);
                                }
                            })
                            .catch(() => {
                                console.log('Resolution error for binding');
                            });
                    }
                }
            } catch (e) {
                return {
                    status: false,
                    nonFatal: true,
                    error: "RoVer couldn't modify the member in this server. Either the bot doesn't have permission or the target user cannot be modified by the bot (such as higher rank in the server)."
                }
            }

            return {
                status: true,
                robloxUsername: data.robloxUsername,
                robloxId: data.robloxId,
                discordId: member.id,
                discordName: member.user.username
            }
        } else {
             switch (data.errorCode){
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
    }
}