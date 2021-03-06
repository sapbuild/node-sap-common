'use strict';
var crypto = require('crypto');
var util = require('util');
require('node-sap-promise');

var pbkdf2 = crypto.pbkdf2;

/**
 *
 */
var cipher = {
    options: {
        keyLength: 32,
        ivLength: 16,
        digest: 'sha256',
        iterationCount: 10000
    }
};

if ((/^v0\.10/).test(process.version)) {
    // In 0.10.x, digest option not supported (hard-coded to SHA1)
    cipher.options.digest = 'sha1';
    cipher.options.nodigest = true;
    pbkdf2 = function (password, salt, iterations, keylen, digest, callback) {
        // digest no supported on 0.10.x
        return crypto.pbkdf2(password, salt, iterations, keylen, callback);
    };
}

/**
 * Derive cipher initialization parameters (key and IV) from password and optional salt
 * @param {string} password Password from which cipher initialization parameters should be derived.
 * @param {string|Buffer} [salt] Explicit salt passed as base64 string or Buffer. If no salt is passed, a random one whose length match options.keyLength will be generated.
 * @param {object} [options] Custom derivation options.
 * @param {number} [options.keyLength] Key length in bytes (default 32 bytes = 256 bits).
 * @param {number} [options.ivLength] Initialization vector length in bytes (default 16 bytes = 128 bits)
 * @param {string} [options.digest] Digest algorithm for PBKDF2 key derivation (default SHA256 on node 0.12+, SHA1 on node 0.10)
 * @param {number} [options.iterationCount] Iteration count for for PBKDF2 key derivation (default 10000)
 * @returns {Promise} Returned promise will eventually be resolved to an object with properties key, iv and salt
 */
cipher.createCipherInit = function (password, salt, options) {
    var initOptions, pwdBuffer, strSalt;
    try {
        if (typeof salt === 'string') {
            salt = new Buffer(salt, 'base64');
        }
        else if (!Buffer.isBuffer(salt)) {
            options = salt;
            salt = undefined;
        }

        initOptions = util._extend({}, cipher.options);
        initOptions = util._extend(initOptions, options);
        if (cipher.options.nodigest) {
            initOptions.digest = 'sha1'; // Changing digest algorithm is not supported on node 0.10
        }
        password = password || '';
        pwdBuffer = new Buffer(password);
        if (!salt) {
            salt = crypto.randomBytes(initOptions.keyLength); // Salt entropy should match key;
            strSalt = salt.toString('base64');
        }
        return Promise.invoke(pbkdf2, pwdBuffer, salt, initOptions.iterationCount, initOptions.keyLength + initOptions.ivLength, initOptions.digest)
            .then(function (kiv) {
                var key = kiv.slice(0, initOptions.keyLength);
                var iv = kiv.slice(initOptions.keyLength);
                return {
                    key: key,
                    iv: iv,
                    salt: strSalt
                };
            });
    }
    catch (err) {
        return Promise.reject(err);
    }
};

/**
 * Initializes a given Cipher object from password and salt
 * @param {string} algorithm Algorithm (e.g. 'aes-256-cbc')
 * @param {string} password Password from which cipher initialization parameters should be derived.
 * @param {string|Buffer} [salt] Explicit salt passed as base64 string or Buffer. If no salt is passed, password is used as salt.
 * @param {object} [options] Custom derivation options.
 * @param {number} [options.keyLength] Key length in bytes (default 32 bytes = 256 bits).
 * @param {number} [options.ivLength] Initialization vector length in bytes (default 16 bytes = 128 bits)
 * @param {string} [options.digest] Digest algorithm for PBKDF2 key derivation (default SHA256 on node 0.12+, SHA1 on node 0.10)
 * @param {number} [options.iterationCount] Iteration count for for PBKDF2 key derivation (default 10000)
 * @returns {Promise} Returned promise will eventually be resolved to the Cipher object
 */
cipher.createCipher = function (algorithm, password, salt, options) {
    if (!Buffer.isBuffer(salt) && (typeof salt === 'object')) {
        options = salt;
        salt = undefined;
    }
    password = password || '';
    if ((typeof salt !== 'string') && (!Buffer.isBuffer(salt))) {
        salt = new Buffer(password);
    }
    return this.createCipherInit(password, salt, options)
        .then(function (init) {
            return crypto.createCipheriv(algorithm, init.key, init.iv);
        });
};

/**
 * Initializes a given Decipher object from password and salt
 * @param {string} algorithm Algorithm (e.g. 'aes-256-cbc')
 * @param {string} password Password from which cipher initialization parameters should be derived.
 * @param {string|Buffer} [salt] Explicit salt passed as base64 string or Buffer. If no salt is passed, password is used as salt.
 * @param {object} [options] Custom derivation options.
 * @param {number} [options.keyLength] Key length in bytes (default 32 bytes = 256 bits).
 * @param {number} [options.ivLength] Initialization vector length in bytes (default 16 bytes = 128 bits)
 * @param {string} [options.digest] Digest algorithm for PBKDF2 key derivation (default SHA256 on node 0.12+, SHA1 on node 0.10)
 * @param {number} [options.iterationCount] Iteration count for for PBKDF2 key derivation (default 10000)
 * @returns {Promise} Returned promise will eventually be resolved to the Decipher object
 */
cipher.createDecipher = function (algorithm, password, salt, options) {
    if (!Buffer.isBuffer(salt) && (typeof salt === 'object')) {
        options = salt;
        salt = undefined;
    }
    password = password || '';
    if ((typeof salt !== 'string') && (!Buffer.isBuffer(salt))) {
        salt = new Buffer(password);
    }
    return this.createCipherInit(password, salt, options)
        .then(function (init) {
            return crypto.createDecipheriv(algorithm, init.key, init.iv);
        });
};

module.exports = cipher;
