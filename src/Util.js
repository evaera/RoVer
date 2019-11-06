const crypto = require('crypto')

/**
 * @module Util
 */
module.exports = {
  /**
   * Performs string formatting for things like custom nicknames.
   *
   * @param {string} formatString The string to format (contains replacement strings)
   * @param {object} data The data to replace the string replacements with
   * @param {GuildMember} member The guild member this string is being formatted for
   * @returns {string} The processed string
   */
  formatDataString (formatString, data, member) {
    const replacements = {
      '%USERNAME%': data.robloxUsername,
      '%USERID%': data.robloxId,
      '%RANK%': data.groupRank || '',
      '%DISCORDNAME%': data.discordName || '',
      '%DISCORDID%': data.discordId || ''
    }

    if (member != null) {
      replacements['%DISCORDNAME%'] = member.user.username
      replacements['%DISCORDID%'] = member.id
      replacements['%SERVER%'] = member.guild.name
    }

    return formatString.replace(/%\w+%/g, (all) => {
      return typeof replacements[all] !== 'undefined' ? replacements[all] : all
    })
  },

  /**
   * Returns a promise that resolves after the given time in milliseconds.
   * @param {int} sleepTime The amount of time until the promise resolves
   * @returns Promise
   */
  async sleep (sleepTime) {
    return new Promise(resolve => {
      setTimeout(resolve, sleepTime)
    })
  },

  /**
   * Takes an array of numbers and simplifies it into a string containing ranges, e.g.:
   * [0, 1, 2, 4, 6, 7, 8] --> "0-2, 4, 6-8"
   * @param {array} numbers The input numbers
   * @returns {string} The output string
   */
  simplifyNumbers (numbers) {
    const output = []
    let rangeStart
    for (let i = 0; i < numbers.length; i++) {
      const number = numbers[i]
      const next = numbers[i + 1]

      if (rangeStart != null && (next - number !== 1 || next == null)) {
        output.push(`${rangeStart}-${number}`)
        rangeStart = null
      } else if (next == null || next - number !== 1) {
        output.push(`${number}`)
      } else if (rangeStart == null) {
        rangeStart = number
      }
    }

    return output.join(', ')
  },

  /**
   * Takes a number and converts it into a simplified and human readable number
   * 1,142,546 --> 1.1M
   * @param {float} toCompress The number to compress
   * @returns {string} The compressed number
   */
  toHumanReadableNumber (toCompress) {
    const numberAbbreviations = ['K', 'M', 'B', 'T']
    let compressedNumber = parseInt(toCompress, 10).toFixed(1)

    // Count how many times the place is shifted
    let placeShift = 0
    while (compressedNumber >= 1000) {
      compressedNumber = (compressedNumber / 1000).toFixed(1)
      placeShift++
    }

    // If the number was simplified, put a number abbreviation on the end
    if (placeShift > 0) {
      compressedNumber += numberAbbreviations[placeShift - 1]
    }
    return compressedNumber
  },

  /**
   * Returns an md5 hash of the input string.
   * This is used for a key for a group binding. The key is the hash of the json of the rank binding.
   * @param {string} string The input string.
   * @returns {string} The md5 hash of the string.
   */
  md5 (string) {
    return crypto.createHash('md5').update(string).digest('hex')
  },

  /**
   * Gets group rank binding text for a binding.
   * Turns a rank binding object into a human-readable format.
   * @param {object} binding The binding object.
   * @param {boolean} [addCodeBlock=false] Whether or not to wrap the binding in markdown code block.
   * @returns {string} The binding in human-readable format.
   */
  getBindingText (binding, addCodeBlock = false) {
    let bindingMessage = addCodeBlock ? '```markdown\n' : ''

    if (binding.groups == null) {
      return `\nInvalid Group Format - Unbind role ${binding.role} to fix this problem.\n`
    }

    for (const [index, group] of binding.groups.entries()) {
      if (index > 0) bindingMessage += '...or\n'

      if (group.id.match(/[a-z]/i)) {
        bindingMessage += `# Virtual Group ${group.id}\n`
        bindingMessage += `Argument ${group.ranks.length > 0 ? group.ranks[0] : 'none'}`
      } else {
        bindingMessage += `# Group ${group.id}\n`
        bindingMessage += `Rank${group.ranks.length === 1 ? '' : 's'} ` + module.exports.simplifyNumbers(group.ranks)
      }
      bindingMessage += '\n\n'
    }

    return addCodeBlock ? bindingMessage + '\n```' : bindingMessage
  },

  /**
   * Gets the user-facing link for the verification registry.
   * This is not used for actually checking against the registry.
   * This is for functionality in the future where we want to know where the user came from to help make sure that
   * they are on the right account on the website by making sure the user is in the guild they came from.
   * @param {Guild} guild The guild this link is being generated for.
   * @returns {string} The link to the verification site
   */
  getVerifyLink (guild) {
    return 'https://verify.eryn.io' // /?from=${guild.id}`
  }
}
