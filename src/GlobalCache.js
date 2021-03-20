const Discord = require('discord.js')

/**
 * The GlobalCache is a singleton that holds an in-memory cache that will hold information
 * from the sub-processes (shards). It is done on the master process so as to not fragment
 * the caches between the shards.
 * @class GlobalCache
 */
class GlobalCache {
  /**
   * Creates an instance of GlobalCache.
   * @param {Discord.ShardingManager} shardingManager The Discord.js sharding manager
   */
  constructor (shardingManager) {
    this.shardingManager = shardingManager
    this.collections = {}

    shardingManager.on('shardCreate', shard => shard.on('message', this.onMessage.bind(this, shard)))
    shardingManager.shards.forEach(shard => shard.on('message', this.onMessage.bind(this, shard)))

    setInterval(() => {
      this.collections = {}
    }, 30000)
  }

  /**
   * Fires when a message from a child shard is sent
   * @listens ShardingManager#message
   * @param {Shard} shard The shard that sent the message
   * @param {object} message The message that was sent
   * @memberof GlobalCache
   */
  onMessage (shard, message) {
    switch (message.action) {
      case 'get':
        this.get(shard, message)
        break
      case 'set':
        this.set(shard, message)
        break
      case 'clear':
        this.clear(shard, message)
        break
    }
  }

  /**
   * Returns the collection  requested
   * @param {string} name The collection name
   * @returns {object} The collection
   * @memberof GlobalCache
   */
  getCollection (name) {
    if (typeof this.collections[name] === 'undefined') {
      this.collections[name] = {}
    }

    return this.collections[name]
  }

  /**
   * Reads a message from a shard and replies with the requested value
   * @param {Shard} shard The shard that sent the message
   * @param {object} message The message sent
   * @memberof GlobalCache
   */
  get (shard, message) {
    const collection = this.getCollection(message.collection)

    shard.send({
      action: 'getReply',
      id: message.id,
      collection: message.collection,
      key: message.key,
      // 'undefined' is not a valid json type (won't persist through serialization)
      value: typeof collection[message.key] === 'undefined' ? null : collection[message.key]
    })
  }

  /**
   * Handles a clear request from a shard
   * @param {Shard} shard The shard that sent the message
   * @param {object} message The message sent
   * @memberof GlobalCache
   */
  clear (shard, message) {
    this.collections[message.collection] = {}

    shard.send({
      action: 'clearReply',
      id: message.id,
      collection: message.collection,
      value: true
    })
  }

  /**
   * Handles a set request from a shard
   * @param {Shard} shard The shard that sent the message
   * @param {object} message The message sent
   * @memberof GlobalCache
   */
  set (shard, message) {
    const collection = this.getCollection(message.collection)
    collection[message.key] = message.value

    shard.send({
      action: 'setReply',
      id: message.id,
      collection: message.collection,
      key: message.key
    })
  }
}

/**
 * The Cache class is the connector between the GlobalCache on the main process and the shards.
 * @class Cache
 */
class Cache {
  /**
   * Creates an instance of Cache.
   * @param {Discord.Client} client The client this cache belongs to
   */
  constructor (client) {
    this.client = client
    this.shardClientUtil = Discord.ShardClientUtil.singleton(this.client)
    this.index = -1
    this.promises = {}

    process.on('message', this.onMessage.bind(this))
  }

  /**
   * Returns a unique id
   * @returns {int} The new id
   * @memberof Cache
   */
  getNextIndex () {
    this.index++
    return this.index
  }

  /**
   * Called when a new message comes in from the master process
   * Resolves all promises related to the message id
   * @param {object} msg The new message
   * @returns {undefined}
   * @memberof Cache
   */
  onMessage (msg) {
    if (typeof msg.id === 'undefined' || !this.promises[msg.id]) {
      return
    }

    // Resolve the promise with the value
    this.promises[msg.id](msg.value)
  }

  /**
   * Gets a value from the global cache
   * @param {string} collection The collection (namespace) which this key belongs to
   * @param {string} key The key you want to get
   * @returns {Promise<any>} The value associated with the key
   * @memberof Cache
   */
  get (collection, key) {
    const id = this.getNextIndex()

    this.shardClientUtil.send({
      action: 'get',
      collection,
      key,
      id
    })

    return new Promise(resolve => {
      this.promises[id] = resolve
    })
  }

  // Returns Promise<true>
  /**
   * Clears a collection (namespace) entirely, useful for resetting a user cache
   * @param {string} collection The collection to clear
   * @returns {Promise<true>} Resolves when the clear is completed.
   * @memberof Cache
   */
  clear (collection) {
    const id = this.getNextIndex()

    this.shardClientUtil.send({
      action: 'clear',
      collection,
      id
    })

    return new Promise(resolve => {
      this.promises[id] = resolve
    })
  }

  // Returns Promise<Value>
  /**
   * Sets a value in the global cache.
   * @param {string} collection The collection (namespace) which this key belongs to
   * @param {string} key The key you want to get
   * @param {any} value The value you want to set
   * @returns {Promise<any>} Returns the value when it is set
   * @memberof Cache
   */
  set (collection, key, value) {
    const id = this.getNextIndex()

    this.shardClientUtil.send({
      action: 'set',
      collection,
      key,
      value,
      id
    })

    return new Promise(resolve => {
      this.promises[id] = resolve
    })
  }
}

module.exports = { GlobalCache, Cache }
