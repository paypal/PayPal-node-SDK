/* Copyright 2015-2016 PayPal, Inc. */
"use strict";

var generate = require('../generate');
var api = require('../api');

/**
 * Create, send and manage invoices, PayPal emails the customer with link to invoice
 * on PayPal's website. Customers can pay with PayPal, check, debit or credit card.
 * @return {Invoice} Invoice functions
 */
function invoice() {
    var baseURL = '/v2/invoicing/invoices/';
    var operations = ['create', 'get', 'list', 'del', 'delete', 'cancel'];

    var ret = {
        baseURL: baseURL,
        search: function search(data, config, cb) {
            api.executeHttp('POST', '/v1/invoicing/search', data, config, cb);
        },
        update: function update(id, query, data, config, cb) {
            api.executeHttp('PUT', this.baseURL + id + (query ? ('?' + query) : ''), data, config, cb);
        },
        send: function send(id, data, config, cb) {
            api.executeHttp('POST', this.baseURL + id + '/send', data, config, cb);
        },
        remind: function remind(id, data, config, cb) {
            api.executeHttp('POST', this.baseURL + id + '/remind', data, config, cb);
        },
        recordPayment: function recordPayment(id, data, config, cb) {
            api.executeHttp('POST', this.baseURL + id + '/record-payment', data, config, cb);
        },
        recordRefund: function recordRefund(id, data, config, cb) {
            api.executeHttp('POST', this.baseURL + id + '/record-refund', data, config, cb);
        },
        deleteExternalPayment: function deleteExternalPayment(invoiceId, transactionId, config, cb) {
            api.executeHttp('DELETE', this.baseURL + invoiceId + '/payment-records/' + transactionId, {}, config, cb);
        },
        deleteExternalRefund: function deleteExternalRefund(invoiceId, transactionId, config, cb) {
            api.executeHttp('DELETE', this.baseURL + invoiceId + '/refund-records/' + transactionId, {}, config, cb);
        },
        generateNumber: function generateNumber(config, cb) {
            api.executeHttp("POST", this.baseURL + '/next-invoice-number', {}, config, cb);
        },
        /* Specify invoice ID to get a QR code corresponding to the invoice */
        qrCode: function qrCode(id, height, width, config, cb) {
            var image_attributes = {
                "height": height,
                "width": width
            };
            api.executeHttp('GET', this.baseURL + id + '/qr-code', image_attributes, config, cb);
        }
    };
    ret = generate.mixin(ret, operations);
    return ret;
}

module.exports = invoice;
