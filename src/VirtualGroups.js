/* global Cache */

const request = require('request-promise')

// VirtualGroups can be used in place of group IDs for
// group bindings. They are defined as keys in the
// VirtualGroups object. It must be a function that
// returns true or false.

/**
 * @module VirtualGroups
 */
module.exports = {
  /**
   * Check if the given user is in the Roblox Dev Forum.
   *
   * @param {object} user The user data
   * @param {int} trustLeve The trust level to check against
   * @returns {boolean} The resolution of the binding
   */
  async DevForumAccess (user, trustLevel) {
    let username = user.username
    let userTrustLevel = await Cache.get(`bindings.${user.id}`, 'DevForumAccess')

    if (!userTrustLevel) {
      try {
        let devForumData = await request({
          uri: `https://devforum.roblox.com/users/${username}.json`,
          json: true,
          simple: false
        })

        userTrustLevel = devForumData.user.trust_level

        Cache.set(`bindings.${user.id}`, 'DevForumAccess', userTrustLevel)
      } catch (e) {
        return false
      }
    }

    if (trustLevel == null && userTrustLevel > 0) {
      return true
    }

    if (!userTrustLevel || userTrustLevel !== trustLevel) {
      return false
    }

    return true
  },

  async DevForum (user) {
    return module.exports.DevForumAccess(user, 2)
  },

  async DevForumBasic (user) {
    return module.exports.DevForumAccess(user, 1)
  },

  /**
   * Returns if the user owns an asset
   * @param {object} user The user data
   * @param {int} assetid The roblox asset id
   * @returns {boolean} The binding resolution
   */
  async HasAsset (user, assetid) {
    let userid = user.id
    try {
      let responseData = await request({
        uri: `http://api.roblox.com/ownership/hasasset?userId=${userid}&assetId=${assetid}`,
        simple: false
      })

      if (responseData === 'true') {
        return true
      }
    } catch (e) {
      // Do nothing
    }

    return false
  },

  /**
   * Returns if the user has the specified type of bc
   * @param {object} user The user data
   * @param {string} [bcType] The type of BC to check for, if omitted works for any bc
   * @returns {boolean} The binding resolution
   * @todo Fix the caching on this. Currently, as all bindings execute at the same time,
   * @todo this won't actually ever cache because they are all requesting. (only if more than one BC bound)
   */
  async BuildersClub (user, bcType) {
    let bc = await Cache.get(`bindings.${user.id}`, 'bc')
    if (!bc) {
      let response = await request({
        uri: `https://www.roblox.com/Thumbs/BCOverlay.ashx?username=${user.username}`,
        simple: false,
        resolveWithFullResponse: true
      })

      let url = response.request.uri.href
      bc = 'NBC'

      if (url.includes('overlay_obcOnly')) {
        bc = 'OBC'
      } else if (url.includes('overlay_tbcOnly')) {
        bc = 'TBC'
      } else if (url.includes('overlay_bcOnly')) {
        bc = 'BC'
      }

      Cache.set(`bindings.${user.id}`, 'bc', bc)
    }

    if (bcType && bcType === bc) {
      return true
    } else if (!bcType && bc !== 'NBC') {
      return true
    }

    return false
  },

  async BC (user) {
    return module.exports.BuildersClub(user, 'BC')
  },

  async TBC (user) {
    return module.exports.BuildersClub(user, 'TBC')
  },

  async OBC (user) {
    return module.exports.BuildersClub(user, 'OBC')
  },

  async NBC (user) {
    return module.exports.BuildersClub(user, 'NBC')
  }
}
