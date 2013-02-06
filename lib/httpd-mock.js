"use strict";
var HttpdMock,
    _ = require("underscore"),
    express = require("express");

exports = module.exports = HttpdMock = function (options) {
    if (!this instanceof HttpdMock) {
        return new HttpdMock();
    }
    this.webServer = express();
    this.options = {};
    this.defaults = require("./httpd-mock.defaults.json");
    if (options) { this.setOptions(options);}
    return this;
};

HttpdMock.prototype.createAdminServices = function() {
    var that = this;
    this.getInstance().get("/admin/reload", function(req, res) {
        that.reloadConfig();
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end('{"configFileReloaded": "true"}');
    });
    return this;
};

HttpdMock.prototype.createWebServices = function () {
    // need to hold a reference to "this" for the GET/POST callbacks.
    var that = this,
        webServices = this.options.webServices;
    if (this.areWebServicesCreated) {
        return this;
    }
    var webServicePath;
    if (webServices && webServices.get) {
        for (webServicePath in webServices.get) {
            webServicePath = this.options.servicesPrefix + webServicePath;
             if (this.options.output) {
                console.log("GET " + webServicePath);
            }
			this.getInstance().get(webServicePath, function (req, res) {
                webServicePath = req.route.path.substr(that.options.servicesPrefix.length);
				res.sendfile(that.options.webServices.get[webServicePath], {root: that.options.jsonMocksPath});
            });
		}
    }
    if (webServices && webServices.post) {
        for (webServicePath in webServices.post) {
            webServicePath = this.options.servicesPrefix + webServicePath;
             if (this.options.output) {
                console.log("POST " + webServicePath);
            }
            this.getInstance().post(webServicePath, function (req, res) {
                webServicePath = req.route.path.substr(that.options.servicesPrefix.length);
                res.sendfile(that.options.webServices.post[webServicePath], {root: that.options.jsonMocksPath});
			});
        }
	}
    this.areWebServicesCreated = true;
    return this;
};

HttpdMock.prototype.getInstance = function () {
    return this.webServer;
};

HttpdMock.prototype.getListener = function () {
    return this.webServerListener;
};

HttpdMock.prototype.getPort = function () {
    return this.options.serverPort;
};

HttpdMock.prototype.setConfigFile = function (file) {
    this.configFilePath = file;
    if (!file) {
        return this.setOptions();
    }
    _.defaults(this.options, require(file), this.defaults);
    return this;
};

HttpdMock.prototype.setOptions = function (options) {
    !this.areDefaultsApplied ? (this.areDefaultsApplied = true) :
        _.defaults(this.options, this.defaults);
    options && (this.options = _.defaults(options, this.options));
    this.options.output === "false" && (this.options.output = false);
    return this;
};

HttpdMock.prototype.setServerRootPath = function (serverRootPath) {
    serverRootPath = serverRootPath || this.options.serverRootPath;
    !this.isServerRootPathDefined ?
        this.getInstance().use(express.static(serverRootPath)) :
        this.isServerRoothPathDefined = true;
    return this;
};

HttpdMock.prototype.start = function (port) {
    port = port || this.options.serverPort;
    this.setServerRootPath().createWebServices().createAdminServices();
    this.webServerListener = this.getInstance().listen(port);
    this.options.serverPort = this.webServerListener.address().port;
    this.options.output &&
        console.log("Http mock server listening on port " + this.options.serverPort);
    return this;
};

HttpdMock.prototype.reloadConfig = function() {
    if (this.configFilePath) {
        console.log("Reloading config file: " + this.configFilePath);
        delete require.cache[this.configFilePath];
        _.extend(this.options, this.defaults, require(this.configFilePath));
        this.areWebServicesCreated = false;
        this.createWebServices();
    } else {
        console.log("No config file path set.");
    }
};