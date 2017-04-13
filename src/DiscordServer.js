const path        = require('path')
const fs          = require('fs')
const Discord     = require('discord.js')
const request     = require('request-promise')
const config      = require('./data/client.json')

// The default settings for DiscordServer.
DefaultSettings = {
    verifiedRole: null,
    nicknameUsers: true,
    announceChannel: null,
    nicknameFormat: "%USERNAME%",
    welcomeMessage: "Welcome to the server, %USERNAME%!",
    groupRankBindings: []
}

// VirtualGroups can be used in place of group IDs for
// group bindings. They are defined as keys in the
// VirtualGroups object. It must be a function that
// returns true or false. 
VirtualGroups = {
    // Check if the given user is in the Roblox Dev Forum.
    // userid: ROBLOX user id.
    DevForum: async (userid) => {
        // Resolve the Roblox username from the user id.
        let userData = {}
        try {
            if (config.loud){
                console.log(`http://api.roblox.com/users/${userid}`);
            }
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

        // Fetch the DevForum data for this user.
        let devForumData = {}
        
        try {
            if (config.loud){
                console.log(`http://devforum.roblox.com/users/${username}.json`);
            }
            devForumData = await request({
                uri: `http://devforum.roblox.com/users/${username}.json`,
                json: true,
                simple: false
            });
        } catch (e) {
            return false;
        }
        
        // If the trust_level in the user data is above 0, then they are a member.
        if (devForumData.user.trust_level > 0) {
            return true;
        }

        return false;
    }
}

module.exports = 
// A DiscordServer class, it represents a guild that
// the bot is in.
class DiscordServer {
    constructor(discordBot, id) {
        this.id = id;
        this.discordBot = discordBot;
        this.bot = this.discordBot.bot;

        this.server = this.bot.guilds.get(id);

        // if the static object DataCache is null, then
        // create the static objects for DiscordServer.
        if (DiscordServer.DataCache == null) {
            DiscordServer.DataCache = {};
            DiscordServer.BindingsCache = {};
        }

        // Load this server's settings. 
        this.settings = {};
        this.settingsPath = path.join(__dirname, "data", `${id}.json`);
        this.loadSettings();
    }

    // This method loads the settings specific for this server.
    // It also creates a settings file if there isn't one.
    loadSettings() {
        // If there's no settings file for this server, create one.
        if (!fs.existsSync(this.settingsPath)) {
            fs.writeFileSync(this.settingsPath, JSON.stringify(DefaultSettings));
        }

        if (!fs.existsSync(this.settingsPath)) {
            throw `Couldn't write settings file: ${this.settingsPath}`;
        }

        // Load the settings file.
        let fileData = fs.readFileSync(this.settingsPath);
        
        try {
            this.settings = JSON.parse(fileData);
        } catch (e) {
            console.log(`${this.settingsPath} appears to be corrupted.`);
        }
    }

    // Returns a setting value. Tries the saved settings, then tries
    // the default settings. 
    getSetting(key) {
        if (typeof this.settings[key] !== 'undefined') {
            return this.settings[key];
        } else if (typeof DefaultSettings[key] !== 'undefined') {
            return DefaultSettings[key];
        } else {
            return null;
        }
    }

    // Set a server setting and then save it to disk.
    setSetting(key, value) {
        this.settings[key] = value;

        fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings));
    }

    // Static, clears the member cache for a specific Discord user.
    static clearMemberCache(id) {
        if (DiscordServer.DataCache) {
            delete DiscordServer.DataCache[id];
        }
    }

    // Static, performs string formatting for things like
    // custom nicknames. 
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

    // Static, checks if a group rank binding passes or fails for
    // a specific Roblox user. 
    static async resolveGroupRankBinding(binding, userid) {
        // Check if the return value of this method has already been
        // cached in memory. If so, return that.
        if (DiscordServer.BindingsCache[userid] && typeof DiscordServer.BindingsCache[userid][JSON.stringify(binding)] !== 'undefined') {
            return DiscordServer.BindingsCache[userid][JSON.stringify(binding)];
        }

        let returnValue = false;

        try {
            if (VirtualGroups[binding.group]){
                // If this group is a virtual group, then execute that function instead.
                returnValue = VirtualGroups[binding.group](userid);
            } else {
                // Check the rank of the user in the Roblox group. 
                if (config.loud) {
                    console.log(`https://assetgame.roblox.com/Game/LuaWebService/HandleSocialRequest.ashx?method=GetGroupRank&playerid=${userid}&groupid=${binding.group}`);
                }
                let rank = await request({
                    uri: `https://assetgame.roblox.com/Game/LuaWebService/HandleSocialRequest.ashx?method=GetGroupRank&playerid=${userid}&groupid=${binding.group}`,
                    simple: false
                });
                rank = parseInt(rank.replace(/[^\d]/g, ''), 10);
                
                if (binding.rank) {
                    // We also need to check the rank. This conditional chooses the configured operator for the binding.
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
        
        // If the user doesn't have a cache object, create one.
        if (!DiscordServer.BindingsCache[userid]) {
            DiscordServer.BindingsCache[userid] = {};
        }

        // Cache the return value in memory.
        DiscordServer.BindingsCache[userid][JSON.stringify(binding)] = returnValue;

        return returnValue;
    }

    // Deletes a group rank binding associated with a role id.
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

    // Gets a member's nickname, formatted with this server's
    // specific settings.
    getMemberNickname(data, member) {
        return DiscordServer.formatDataString(this.getSetting('nicknameFormat'), data, member)
    }

    // Gets this server's specific welcome message, or the default
    // one if none is configured.
    getWelcomeMessage(data) {
        return DiscordServer.formatDataString(this.getSetting('welcomeMessage'), data);
    }
    
    // Checks to see if this server has configured a custom welcome
    // message.
    hasCustomWelcomeMessage() {
        return DefaultSettings.welcomeMessage !== this.getSetting('welcomeMessage');
    }

    // This method is called to update the state of a specific member
    // in this Discord server.
    async verifyMember(id, options) {
        var options = options || {};
        let data = {};
        let member;

        try {
            if (config.loud && !DiscordServer.DataCache[id]) {
                console.log(`https://verify.eryn.io/api/user/${id}`);
            }
            // Read user data from memory, or request it if there isn't any cached.
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

        // If the status is ok, the user is in the database.
        if (data.status === "ok"){
            // Cache the data for future use.
            DiscordServer.DataCache[id] = data;

            try {
                member = await this.server.fetchMember(id);

                if (!member) {
                    return;
                }

                if (config.loud) {
                    console.log(member.id);
                }

                // Check if these settings are enabled for this specific server,
                // if so, then put the member in the correct state.

                if (this.getSetting('nicknameUsers')) {
                    member.setNickname(this.getMemberNickname(data, member));
                }

                if (this.getSetting('verifiedRole')) {
                    member.addRole(this.getSetting('verifiedRole'));
                }

                if (this.getSetting('announceChannel') && options.announce !== false) {
                    let channel = await this.server.channels.get(this.getSetting('announceChannel'));

                    if (channel) {
                        channel.send(`**User verified:** <@${id}> as ${data.robloxUsername}`);
                    }
                }

                // Check if we want to resolve group rank bindings with cached or fresh data.
                if (options.clearBindingsCache !== false) {
                    DiscordServer.BindingsCache[data.robloxId] = {};
                }

                // Resolve group rank bindings for this member.
                if (this.getSetting('groupRankBindings').length > 0) {
                    for (let binding of this.getSetting('groupRankBindings')) {
                        // We use a Promise.then here so that they all execute asynchronously. 
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
                // If anything failed here, it's most likely because the bot
                // couldn't modify the member due to a permission problem.
                if (config.loud) console.log(e.message);
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
            // Status was not "ok".
             switch (data.errorCode){
                case 404:
                    // User isn't in the database.
                    return {
                        status: false,
                        error: "Not verified. Go to https://verify.eryn.io to verify."
                    }
                case 429: 
                    // This client has exceeded the amount of requests allowed in a 60 second period.
                    return {
                        status: false,
                        error: "Server is busy. Please try again later."
                    }
                default:
                    // Something else is wrong.
                    return {
                        status: false,
                        error: "Unknown error."
                    }
            }
        }
    }
}