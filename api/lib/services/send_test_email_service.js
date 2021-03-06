import juice from 'juice';
import * as Liquid from 'liquid-node';
import { logger } from '../index';

const liquid = new Liquid.Engine();

class SendTestEmailService {

  static create(sesClient, params) {
    return new SendTestEmailService(sesClient, params);
  }

  constructor(sesClient, { body, subject, emails, emailFrom, metadata } = {}) {
    this.sesClient = sesClient;
    this.body = body;
    this.subject = subject;
    this.emails = emails;
    this.metadata = metadata || {};
    this.emailFrom = emailFrom || process.env.DEFAULT_EMAIL_ADDRESS;
  }

  sendEmail() {
    logger().debug('= SendTestEmailService.sendEmail', `Sending test email to ${this.emails}`);
    return this._checkParams()
      .then(() => this._buildBody(this.body, this.metadata))
      .then(parsedBody => this._inlineBodyCss(parsedBody))
      .then(body => this._buildSesRequest({body}))
      .then(sesParams => this._deliver(sesParams));
  }

  _checkParams() {
    return new Promise((resolve, reject) => {
      logger().debug('= SendTestEmailService._checkParams', 'Checking parameters');
      if (this.body && this.subject && this.emails) {
        resolve(true);
      } else {
        logger().debug('= SendTestEmailService._checkParams', 'Error', this.emails, this.body, this.subject);
        reject(new Error('Params missing'));
      }
    });
  }

  _buildBody(body, metadata = {}) {
    return liquid.parseAndRender(body, this.metadata);
  }

  _inlineBodyCss(body) {
    return new Promise((resolve) => {
      logger().debug('= SendTestEmailService._inlineBodyCss');
      const inlinedBody = juice(body);
      resolve(inlinedBody);
    });
  }

  _buildSesRequest({body}) {
    return new Promise((resolve) => {
      logger().debug('= SendTestEmailService._buildSesRequest');
      resolve({
        Source: this.emailFrom,
        Destination: {
          ToAddresses: this.emails
        },
        Message: {
          Body: { Html: { Data: body || this.body } },
          Subject: { Data: `[MoonMail-TEST] ${this.subject}` }
        }
      });
    });
  }

  _deliver(sesParams) {
    return new Promise((resolve, reject) => {
      logger().debug('= SendTestEmailService._deliver', 'Sending email', JSON.stringify(sesParams));
      this.sesClient.sendEmail(sesParams, (err, data) => {
        err ? reject(err) : resolve(data);
      });
    });
  }
}

module.exports.SendTestEmailService = SendTestEmailService;
