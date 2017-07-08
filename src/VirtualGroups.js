const path        = require('path')
const fs          = require('fs')
const Discord     = require('discord.js')
const request     = require('request-promise')
const config      = require('./data/client.json')

// VirtualGroups can be used in place of group IDs for
// group bindings. They are defined as keys in the
// VirtualGroups object. It must be a function that
// returns true or false. 
module.exports = {
    // Check if the given user is in the Roblox Dev Forum.
    // userid: ROBLOX user id.
    DevForum: async (userid) => {
        // Resolve the Roblox username from the user id.
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

        if (!username) return false;

        // Fetch the DevForum data for this user.
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
        
        try {
            // If the trust_level in the user data is above 0, then they are a member.
            if (devForumData.user.trust_level > 0) {
                return true;
            }
        } catch(e) {
            return false;
        }

        return false;
    }
}