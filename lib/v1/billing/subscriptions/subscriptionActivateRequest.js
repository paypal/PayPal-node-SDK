'use strict';

const querystring = require('querystring'); // eslint-disable-line no-unused-vars
/**
 Re-activates a suspended billing agreement, by ID. In the JSON request body, include an `agreement_state_descriptor` object with with a note that describes the reason for the re-activation and the agreement amount and currency.
 **/

class SubscriptionActivateRequest {
  constructor(subscriptionId) {
    this.path = '/v1/billing/subscriptions/{subscription_id}/activate?';
    this.path = this.path.replace(
      '{subscription_id}',
      querystring.escape(subscriptionId)
    );
    this.verb = 'POST';
    this.body = null;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }

  requestBody(activateRequestReason) {
    this.body = activateRequestReason;
    return this;
  }
}

module.exports = {SubscriptionActivateRequest: SubscriptionActivateRequest};
