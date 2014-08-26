/* Utility singleton */
var utility = {
    regexes: {
        newLine: /\r\n|\r|\n/,
        doubleNewLine: /\r?\n\r?\n/,
        headerAttribute: /:(.+)?/,
        fold: /\r\n|\r|\n(?:[ \t]+)/g,
        email: /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/g,
        ipAddr: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
        header: /^(.+): ((.|\r\n\s)+)\r\n/mg,
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

module.exports = utility;