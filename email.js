/* Email document class */
function emailDocument() {
    var email = this;
    email.boundaries;
    email.headers = {};
    email.mimeFragments = [];
    email.raw;
    email.originatingIp;
    email.content;
    email.html;
    email.attachments;
    email.replyTo;
    email.from;
    email.to;
    email.subject;
    email.headerBlock;
    email.bodyBlock;
}

emailDocument.prototype.loadFile = function(filename) {
    var email = this;

    var fs = require('fs');
    email.raw = fs.readFileSync(filename).toString();
}

module.exports = emailDocument;