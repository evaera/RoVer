/* eslint-disable */
// A file for testing requests through fiddler. Add `require('./proxy')()` to the top of index.js to enable this
const url = require("url"),
    http = require("http"),

    env = process.env,

    proxy = {
        protocol: "http:",
        hostname: "127.0.0.1",
        port: 8888,
    },

    proxyRequests = function () {
        var proxyUrl = url.format(proxy);
        env.http_proxy = proxyUrl;
        env.https_proxy = proxyUrl;
        env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
    },

    unproxyRequests = function () {
        env.http_proxy = "";
        env.https_proxy = "";
        env.NODE_TLS_REJECT_UNAUTHORIZED = "";
    }

module.exports = proxyRequests
