const Discord       = require('discord.js')

// The GlobalCache is a singleton that holds an in-memory cache that will hold information
// from the sub-processes (shards). It is done on the master process so as to not fragment
// the caches between the shards.
class GlobalCache {
    constructor(shardingManager) {
        this.shardingManager = shardingManager;
        this.collections = {};
        shardingManager.on('message', this.onMessage.bind(this));
    }

    onMessage(shard, message) {
        // console.log(message);
        switch (message.action) {
            case "get":
                this.get(shard, message);
                break;
            case "set":
                this.set(shard, message);
                break;
            case "clear":
                this.clear(shard, message);
                break;
        }
    }

    getCollection(name) {
        if (typeof this.collections[name] === 'undefined') {
            this.collections[name] = {};
        }

        return this.collections[name];
    }

    get(shard, message) {
        let collection = this.getCollection(message.collection);

        shard.send({
            action: "getReply",
            id: message.id,
            collection: message.collection,
            key: message.key,
            // 'undefined' is not a valid json type (won't persist through serialization)
            value: collection[message.key] || null
        });
    }

    clear(shard, message) {
        this.collections[message.collection] = {};

        shard.send({
            action: "clearReply",
            id: message.id,
            collection: message.collection,
            value: true
        });
    }

    set(shard, message) {
        let collection = this.getCollection(message.collection);
        collection[message.key] = message.value;

        shard.send({
            action: "setReply",
            id: message.id,
            collection: message.collection,
            key: message.key,
            // 'undefined' is not a valid json type (won't persist through serialization)
            value: collection[message.key] || null 
        });
    }
}

// The Cache class is the connector between the GlobalCache on the main process and the shards.
class Cache {
    constructor(client) {
        this.client = client;
        this.shardClientUtil = new Discord.ShardClientUtil(this.client);
        this.index = -1;
        this.promises = {};

        process.on('message', this.onMessage.bind(this));
    }

    // Returns a unique id
    getNextIndex() {
        this.index++;
        return this.index;
    }

    // Called when a new message comes in from the master process
    onMessage(msg) {
        if (typeof msg.id === 'undefined' || typeof msg.value === 'undefined' || !this.promises[msg.id]) {
            return;
        }

        // Resolve the promise with the value
        this.promises[msg.id](msg.value);
    }

    // Returns Promise<Value>
    get(collection, key) {
        let id = this.getNextIndex();

        this.shardClientUtil.send({
            action: "get",
            collection,
            key,
            id
        });

        return new Promise((resolve, reject) => {
            this.promises[id] = resolve;
        });
    }

    // Returns Promise<true>
    clear(collection) {
        let id = this.getNextIndex();

        this.shardClientUtil.send({
            action: "clear",
            collection,
            id
        });

        return new Promise((resolve, reject) => {
            this.promises[id] = resolve;
        });
    }

    // Returns Promise<Value>
    set(collection, key, value) {
        let id = this.getNextIndex();

        this.shardClientUtil.send({
            action: "set",
            collection,
            key,
            value,
            id
        });

        return new Promise((resolve, reject) => {
            this.promises[id] = resolve;
        });
    }
}

module.exports = {GlobalCache, Cache}