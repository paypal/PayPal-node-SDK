/* Copyright 2015-2016 PayPal, Inc. */
"use strict";

var generate = require('../generate');
var api = require('../api');

/**
 * Take action on a payment with the intent of order
 * @return {Object} order functions
 */
function order() {
    var baseURL = '/v1/reporting/transactions';
    var operations = [];

    var ret = {
        baseURL: baseURL,
        /**
         * Get transactions
         * @param  {String}   id     Order identifier
         * @param  {Object|Function}   config     Configuration parameters e.g. client_id, client_secret override or callback
         * @param  {Function} cb        
         * @return {Object}          Order object, with state set to voided
         */
        get: function get(startDate, endDate, config, cb) {

            //start_date
            // end_date
            const path = `${this.baseURL}?start_date=${startDate}&end_date=${endDate}`;

            api.executeHttp('GET', path, {}, config, cb);
        },
    };
    ret = generate.mixin(ret, operations);
    return ret;
}

module.exports = order;
