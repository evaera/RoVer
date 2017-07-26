const path          = require('path')
const fs            = require('mz/fs')
const Discord       = require('discord.js')
const request       = require('request-promise')
const config        = require('./data/client.json')
const VirtualGroups = require('./VirtualGroups.js')
const DiscordMember = require('./DiscordMember')
const Util          = require('./Util')

// The default settings for DiscordServer.
const DefaultSettings = {
    verifiedRole: null,
    verifiedRemovedRole: null,
    nicknameUsers: true,
    announceChannel: null,
    nicknameFormat: "%USERNAME%",
    welcomeMessage: "Welcome to the server, %USERNAME%!",
    groupRankBindings: []
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

        // Load this server's settings. 
        this.settings = {};
        this.areSettingsLoaded = false;
        this.settingsPath = path.join(__dirname, "data", `${id}.json`);

        // We will load the settings in DiscordBot.getServer in order to know when
        // the server is ready from the promise it returns.
        // this.loadSettings();
    }

    // This method loads the settings specific for this server.
    // It also creates a settings file if there isn't one.
    async loadSettings() {
        if (this.areSettingsLoaded) {
            return;
        }
        
        // If there's no settings file for this server, create one.
        if (!await fs.exists(this.settingsPath)) {
            await fs.writeFile(this.settingsPath, JSON.stringify(DefaultSettings));
        }

        if (!await fs.exists(this.settingsPath)) {
            throw `Couldn't write settings file: ${this.settingsPath}`;
        }

        // Load the settings file.
        let fileData = await fs.readFile(this.settingsPath);
        
        try {
            this.settings = JSON.parse(fileData);
            this.areSettingsLoaded = true;
        } catch (e) {
            console.log(`${this.settingsPath} appears to be corrupted.`);
        }
    }

    // Static, clears the member cache for a specific Discord user.
    static clearMemberCache(id) {
        Cache.set("users", id, null);
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

    // Static, checks if a group rank binding passes or fails for
    // a specific Roblox user. 
    static async resolveGroupRankBinding(binding, userid, username) {
        // Check if the return value of this method has already been
        // cached in memory. If so, return that.
        let cachedBinding = await Cache.get(`bindings.${userid}`, JSON.stringify(binding));
        if (cachedBinding !== null) return cachedBinding;

        let returnValue = false;

        try {
            if (VirtualGroups[binding.group]){
                // If this group is a virtual group, then execute that function instead.
                // 'all' is remapped to >1. Since this is the equivalent of no argument, we set it to null here.
                returnValue = await VirtualGroups[binding.group]({id: userid, username}, (binding.operator === 'gt' && binding.rank === 1) ? null : binding.rank);
            } else {
                // Check the rank of the user in the Roblox group. 
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
            if (config.loud) console.log("Encountered an error while trying to resolve a rank binding:");
            if (config.loud) console.log(e);
            if (config.loud) console.log(binding);
        }
        
        // Cache the return value in memory.
        Cache.set(`bindings.${userid}`, JSON.stringify(binding), returnValue);

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

    // Gets this server's specific welcome message, or the default
    // one if none is configured.
    getWelcomeMessage(data) {
        return Util.formatDataString(this.getSetting('welcomeMessage'), data);
    }
    
    // Checks to see if this server has configured a custom welcome
    // message.
    hasCustomWelcomeMessage() {
        return DefaultSettings.welcomeMessage !== this.getSetting('welcomeMessage');
    }

    // Returns a DiscordMember belonging to this DiscordServer.
    async getMember(id) {
        return await DiscordMember.new(this, id);
    }
}