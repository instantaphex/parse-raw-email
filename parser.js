/* Utility singleton */
var utility = {
    regexes: {
        newLine: /\r\n|\r|\n/,
        doubleNewLine: /\r?\n\r?\n/,
        headerAttribute: /:(.+)?/,
        fold: /\r\n|\r|\n(?:[ \t]+)/g,
        email: /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/g,
        ipAddr: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
    },
    extractEmail: function(text) {
        var email = text.match(utility.regexes.email);
        if (email === null) {
            return '';
        }
        if (email.length > 1) {
            return email;
        } else {
            return email[0];
        }
    },
    extractIP: function(text) {
        var ip = text.match(utility.regexes.ipAddr);
        if (ip === null) {
            return '';
        }
        if (ip.length > 1) {
            return ip;
        } else {
            return ip[0];
        }
    },
    decodeBase64: function(text) {
        return new Buffer(text.trim(), 'base64').toString('ascii');
    },
    getIndicesOf: function(searchStr, str) {
        var startIndex = 0,
            searchStrLen = searchStr.length;
        var index, indices = [];

        while ((index = str.indexOf(searchStr, startIndex)) > -1) {
            indices.push(index);
            startIndex = index + searchStrLen;
        }
        return indices;
    },
    /* From PHP.js - http://phpjs.org/functions/quoted_printable_decode/ */
    decodeQuotedPrintable: function(text) {
        var RFC2045Decode1 = /=\r\n/gm,
            // Decodes all equal signs followed by two hex digits
            RFC2045Decode2IN = /=([0-9A-F]{2})/gim,
            // the RFC states against decoding lower case encodings, but following apparent PHP behavior
            // RFC2045Decode2IN = /=([0-9A-F]{2})/gm,
            RFC2045Decode2OUT = function(sMatch, sHex) {
                return String.fromCharCode(parseInt(sHex, 16));
            };
        return text.replace(RFC2045Decode1, '')
            .replace(RFC2045Decode2IN, RFC2045Decode2OUT);
    }
};

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

/* Parser class */
function parseEmail(emailFile) {
    var parser = this;

    parser.message = new emailDocument();
    parser.message.loadFile(emailFile);
    parser.splitDoc(parser.message);
}

parseEmail.prototype.splitDoc = function(data) {
    var parser = this;
    /* find start of body */
    var bodyStart = data.raw.substring(0).search(utility.regexes.doubleNewLine);
    /* Grab Header Block */
    data.headerBlock = data.raw.substring(0, bodyStart).trim();
    /* unfold long header fields */
    data.headerBlock = data.headerBlock.replace(utility.regexes.fold, ' ');
    /* Grab Body block */
    data.bodyBlock = data.raw.substring(bodyStart);
}

parseEmail.prototype.parseHeader = function(headerBlock) {
    var parser = this;
    var result = {};

    if (headerBlock === '') {
        return result;
    }

    /* Split Header Block into Key/Value pairs */
    headerBlock.split(utility.regexes.newLine).forEach(function(line) {
        var arr = line.split(utility.regexes.headerAttribute);

        if (arr[0] === '' || typeof arr[0] === 'undefined') {
            return true
        }
        /* handle empty attributes */
        arr[0] = arr[0] || '';
        arr[1] = arr[1] || '';

        /* build header object */
        result[arr[0].trim()] = arr[1].trim();
    });

    parser.storeHeader(result);
}

parseEmail.prototype.parseBody = function(bodyBlock) {
    var parser = this;
    var result = {};

    if (bodyBlock === '') {
        return result;
    }
    /* decode base64 */
    var encoding = parser.message.headers['Content-Transfer-Encoding'] || '';
    if (encoding !== '' && encoding === 'base64') {
        bodyBlock = utility.decodeBase64(bodyBlock)
        console.log('decoding');
    }
    /* get main type */
    var mainType = parser.message.headers['Content-Type'].split(/\//, 1);

    switch (mainType[0]) {
        case 'text':
            parser.parseTextBody(bodyBlock);
            break;
        case 'text':
            parser.parseTextBody(bodyBlock);
            break;
        case 'multipart':
            parser.parseMultiPart(bodyBlock);
            break;
        default:
            parser.parseTextBody(bodyBlock);
            break;
    }
}

parseEmail.prototype.parseTextBody = function(bodyBlock) {
    var parser = this;

    parser.storeBody(bodyBlock.trim());
    console.log('parsing text...');
}

parseEmail.prototype.parseMultiPart = function(bodyBlock) {
    var parser = this;
    console.log('parsing multipart');

    /* Get MIME container starting points */
    var indices = utility.getIndicesOf(parser.message.boundaries, bodyBlock);

    /* Grab each container from the body block */
    for (i = 0; i < indices.length - 1; i++) {
        console.log('Fragment ' + (i + 1).toString() + ' added.');
        var theBlock = bodyBlock.substring(indices[0 + i] + parser.message.boundaries.length, indices[1 + i]).trim()
        parser.message.mimeFragments.push(theBlock);
    }
}

parseEmail.prototype.storeBody = function(bodyContent) {
    var parser = this;

    parser.message.content = bodyContent;
}

parseEmail.prototype.storeHeader = function(headerObj) {
    var parser = this;

    parser.message.headers = headerObj;

    var to = parser.message.headers['Delivered-To'] || parser.message.headers['To'];
    var from = parser.message.headers['Return-Path'] || parser.message.headers['From'];
    var subject = parser.message.headers['Subject'] || '';
    var oip = parser.message.headers['x-originating-ip'] || '';
    var bound = parser.message.headers['Content-Type'].split('boundary=');

    if (bound.length > 1) {
        parser.message.boundaries = '--' + bound[1].replace(/"/g, '');
        if (parser.message.boundaries.indexOf(';') > -1) {
            bound = parser.message.boundaries.split(';');
            parser.message.boundaries = bound[0];
        }
    }
    /* Store recipient */
    parser.message.to = utility.extractEmail(to);
    /* Store Sender */
    parser.message.from = utility.extractEmail(from);
    /* Store Subject */
    parser.message.subject = utility.extractEmail(subject);
    /* Store originating IP */
    parser.message.originatingIp = utility.extractIP(oip);
}

parseEmail.prototype.parseMail = function(message) {
    var parser = this;

    parser.parseHeader(message.headerBlock);
    parser.parseBody(message.bodyBlock);
}

/* Simple Usage Example */
var emailParser = new parseEmail('data');
emailParser.parseMail(emailParser.message)