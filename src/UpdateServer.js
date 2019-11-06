const express = require('express')

module.exports =
// This function starts the update server. This is used
// to cause the bot to download new information about a
// target user and update the user's state in all servers.
function (shardingManager, config) {
  const server = express()

  server.get('/update-user', (req, res) => {
    if (config.apiKey && config.apiKey !== req.query.apiKey) {
      return res.status(403).end()
    }

    if (req.query.id == null || req.query.guilds == null) {
      return res.status(400).end()
    }

    const id = req.query.id
    const guilds = req.query.guilds.split(',')

    res.end('ok')

    shardingManager.broadcast({
      action: 'globallyUpdateMember',
      argument: { id, guilds }
    })
  })

  server.listen(config.port, () => {
    console.log(`Update server listening on http://localhost:${config.port}/`)
  })
}
