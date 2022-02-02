/* Copyright 2015-2016 PayPal, Inc. */
"use strict";

var client = require('./client');
var utils = require('./utils');
var configuration = require('./configure');

/**
 * token_persist client id to access token cache, used to reduce access token round trips
 * @type {Object}
 */
var token_persist = {};

/**
 * Set up configuration globally such as client_id and client_secret,
 * by merging user provided configurations otherwise use default settings
 * @param  {Object} options Configuration parameters passed as object
 * @return {undefined}
 */
var configure = exports.configure = function configure(options) {
    if (options !== undefined && typeof options === 'object') {
        configuration.default_options = utils.merge(configuration.default_options, options);
    }

    if (configuration.default_options.mode !== 'sandbox' && configuration.default_options.mode !== 'live') {
        throw new Error('Mode must be "sandbox" or "live"');
    }
};

/**
 * Generate new access token by making a POST request to /oauth2/token by
 * exchanging base64 encoded client id/secret pair or valid refresh token.
 *
 * Otherwise authorization code from a mobile device can be exchanged for a long
 * living refresh token used to charge user who has consented to future payments.
 * @param  {Object|Function}   config Configuration parameters such as authorization code or refresh token
 * @param  {Function} cb     Callback function
 * @return {String}          Access token or Refresh token
 */
var generateToken = exports.generateToken = function generateToken(config, cb) {

    if (typeof config === "function") {
        cb = config;
        config = configuration.default_options;
    } else if (!config) {
        config = configuration.default_options;
    } else {
        config = utils.merge(config, configuration.default_options, true);
    }

    var payload = 'grant_type=client_credentials';
    if (config.authorization_code) {
        payload = 'grant_type=authorization_code&response_type=token&redirect_uri=urn:ietf:wg:oauth:2.0:oob&code=' + config.authorization_code;
    } else if (config.refresh_token) {
        payload = 'grant_type=refresh_token&refresh_token=' + config.refresh_token;
    }

    var basicAuthString = 'Basic ' + new Buffer(config.client_id + ':' + config.client_secret).toString('base64');

    var http_options = {
        schema: config.schema || configuration.default_options.schema,
        host: utils.getDefaultApiEndpoint(config.mode) || config.host || configuration.default_options.host,
        port: config.port || configuration.default_options.port,
        headers: utils.merge({
            'Authorization': basicAuthString,
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }, configuration.default_options.headers, true)
    };

    client.invoke('POST', '/v1/oauth2/token', payload, http_options, function (err, res) {
        var token = null;
        if (res) {
            if (!config.authorization_code && !config.refresh_token) {
                var seconds = new Date().getTime() / 1000;
                token_persist[config.client_id] = res;
                token_persist[config.client_id].created_at = seconds;
            }

            if (!config.authorization_code) {
                token = res.token_type + ' ' + res.access_token;
            }
            else {
                token = res.refresh_token;
            }
        }
        cb(err, token);
    });
};

/* Update authorization header with new token obtained by calling
generateToken */
/**
 * Updates http Authorization header to newly created access token
 * @param  {Object}   http_options   Configuration parameters such as authorization code or refresh token
 * @param  {Function}   error_callback
 * @param  {Function} callback
 */
function updateToken(http_options, error_callback, callback) {
    generateToken(http_options, function (error, token) {
        if (error) {
            error_callback(error, token);
        } else {
            http_options.headers.Authorization = token;
            callback();
        }
    });
}

/**
 * Makes a PayPal REST API call. Reuses valid access tokens to reduce
 * round trips, handles 401 error and token expiration.
 * @param  {String}   http_method           A HTTP Verb e.g. GET or POST
 * @param  {String}   path                  Url endpoint for API request
 * @param  {Data}   data                    Payload associated with API request
 * @param  {Object|Function}   http_options Configurations for settings and Auth
 * @param  {Function} cb                    Callback function
 */
var executeHttp = exports.executeHttp = function executeHttp(http_method, path, data, http_options, cb) {
    if (typeof http_options === "function") {
        cb = http_options;
        http_options = null;
    }
    if (!http_options) {
        http_options = configuration.default_options;
    } else {
        http_options = utils.merge(http_options, configuration.default_options, true);
    }

    //Get host endpoint using mode
    http_options.host = utils.getDefaultApiEndpoint(http_options.mode) || http_options.host;

    function retryInvoke() {
        client.invoke(http_method, path, data, http_options, cb);
    }

    // correlation-id is deprecated in favor of client-metadata-id
    if (http_options.client_metadata_id) {
        http_options.headers['Paypal-Client-Metadata-Id'] = http_options.client_metadata_id;
    }
    else if (http_options.correlation_id) {
        http_options.headers['Paypal-Client-Metadata-Id'] = http_options.correlation_id;
    }

    // If client_id exists with an unexpired token and a refresh token is not provided, reuse cached token
    if (http_options.client_id in token_persist && !utils.checkExpiredToken(token_persist[http_options.client_id]) && !http_options.refresh_token) {
        http_options.headers.Authorization = "Bearer " + token_persist[http_options.client_id].access_token;
        client.invoke(http_method, path, data, http_options, function (error, response) {
            // Don't reprompt already authenticated user for login by updating Authorization header
            // if token expires
            if (error && error.httpStatusCode === 401 && http_options.client_id && http_options.headers.Authorization) {
                http_options.headers.Authorization = null;
                updateToken(http_options, cb, retryInvoke);
            } else {
                cb(error, response);
            }
        });
    } else {
        updateToken(http_options, cb, retryInvoke);
    }
};

exports.generateClientToken = function generateClientToken(config, cb) {
    executeHttp('POST', '/v1/identity/generate-token', {}, config, cb);
};
