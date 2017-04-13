const express       = require('express')
const DiscordServer = require('./DiscordServer')

module.exports = 
// This function starts the update server. This is used
// to cause the bot to download new information about a
// target user and update the user's state in all servers.
function(shardingManager, config) {
    let server = express();

    server.get('/update-user', (req, res) => {
        if (config.apiKey && config.apiKey !== req.query.apiKey) {
            res.status(403).end();
        }

        if (req.query.id == null) {
            res.status(400).end();
        }

        let id = req.query.id;

        res.end('ok');

        shardingManager.broadcast({
            action: 'globallyUpdateMember',
            argument: id
        });
    })

    server.listen(config.port, () => {
        console.log(`Update server listening on http://localhost:${config.port}/`);
    });
}