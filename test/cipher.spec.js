'use strict';
var crypto = require('crypto');
var expect = require('chai').expect;
var cipher = require('../index.js').cipher;

var password = 'It\'s a kind of magic';
var clearText = 'Hello world!';

function testPassed(done) {
    return function () {
        done();
    };
}
function testFailed(done) {
    return function (err) {
        done(err);
    };
}
/*
 function preventOnFulfilled() {
 throw new Error('Promise should not be fulfilled');
 }
 */

describe('cipher', function () {
    this.slow(100);
    describe('.createCipherInit', function () {
        it('should create cipher initialization data', function (done) {
            cipher.createCipherInit(password)
                .then(function (init) {
                    expect(Buffer.isBuffer(init.key)).to.be.true;
                    expect(Buffer.isBuffer(init.iv)).to.be.true;
                    expect(init.salt).to.be.a('string');
                    expect(init.key.toString('hex').length).to.equal(64);
                    expect(init.iv.toString('hex').length).to.equal(32);
                    expect(init.salt.length).to.equal(44); // 32 bytes in base64
                })
                .then(testPassed(done), testFailed(done));
        });
        it('should have a deterministic output for given password, salt and derivation options', function (done) {
            var cipherInit;
            cipher.createCipherInit(password)
                .then(function (init) {
                    expect(Buffer.isBuffer(init.key)).to.be.true;
                    expect(Buffer.isBuffer(init.iv)).to.be.true;
                    expect(init.salt).to.be.a('string');
                    cipherInit = {
                        key: init.key.toString('hex'),
                        iv: init.iv.toString('hex'),
                        salt: init.salt
                    };
                    expect(cipherInit.iv.length).to.equal(32);
                    expect(cipherInit.key.length).to.equal(64);
                    expect(init.salt.length).to.equal(44); // 32 bytes in base64
                    return cipher.createCipherInit(password, cipherInit.salt);
                })
                .then(function (init) {
                    expect(init.key.toString('hex')).to.equal(cipherInit.key);
                    expect(init.iv.toString('hex')).to.equal(cipherInit.iv);
                })
                .then(testPassed(done), testFailed(done));
        });

    });
    describe('.createCipher', function () {
        it('should create a cipher with key and initialization vector derived from a password and salt', function (done) {
            var salt, cipherText;
            Promise.invoke(crypto.randomBytes, 16)
                .then(function (rnd) {
                    salt = rnd;
                    return cipher.createCipher('aes-256-cbc', password, salt);
                })
                .then(function (cipher) {
                    cipherText = cipher.update(clearText, 'utf-8', 'base64');
                    cipherText += cipher.final('base64');
                })
                .then(function () {
                    return cipher.createCipherInit(password, salt);
                })
                .then(function (init) {
                    var decipher = crypto.createDecipheriv('aes-256-cbc', init.key, init.iv);
                    var text = decipher.update(cipherText, 'base64', 'utf-8');
                    text += decipher.final('utf-8');
                    expect(text).to.equal(clearText);
                })
                .then(testPassed(done), testFailed(done));
        });
        it('should use the password as salt if no salt is passed', function (done) {
            var cipherText;
            cipher.createCipher('aes-256-cbc', password)
                .then(function (cipher) {
                    cipherText = cipher.update(clearText, 'utf-8', 'base64');
                    cipherText += cipher.final('base64');
                })
                .then(function () {
                    return cipher.createCipherInit(password, new Buffer(password));
                })
                .then(function (init) {
                    var decipher = crypto.createDecipheriv('aes-256-cbc', init.key, init.iv);
                    var text = decipher.update(cipherText, 'base64', 'utf-8');
                    text += decipher.final('utf-8');
                    expect(text).to.equal(clearText);
                })
                .then(testPassed(done), testFailed(done));
        });
    });
    describe('.createDecipher', function () {
        it('should create a decipher with key and initialization vector derived from a password and salt', function (done) {
            var salt, cipherText;
            Promise.invoke(crypto.randomBytes, 16)
                .then(function (rnd) {
                    salt = rnd;
                    return cipher.createCipherInit(password, salt);
                })
                .then(function (init) {
                    var cipher = crypto.createCipheriv('aes-256-cbc', init.key, init.iv);
                    cipherText = cipher.update(clearText, 'utf-8', 'base64');
                    cipherText += cipher.final('base64');
                })
                .then(function () {
                    return cipher.createDecipher('aes-256-cbc', password, salt);
                })
                .then(function (decipher) {
                    var text = decipher.update(cipherText, 'base64', 'utf-8');
                    text += decipher.final('utf-8');
                    expect(text).to.equal(clearText);
                })
                .then(testPassed(done), testFailed(done));
        });
        it('should use the password as salt if no salt is passed', function (done) {
            var cipherText;
            cipher.createCipherInit(password, new Buffer(password))
                .then(function (init) {
                    var cipher = crypto.createCipheriv('aes-256-cbc', init.key, init.iv);
                    cipherText = cipher.update(clearText, 'utf-8', 'base64');
                    cipherText += cipher.final('base64');
                })
                .then(function () {
                    return cipher.createDecipher('aes-256-cbc', password);
                })
                .then(function (decipher) {
                    var text = decipher.update(cipherText, 'base64', 'utf-8');
                    text += decipher.final('utf-8');
                    expect(text).to.equal(clearText);
                })
                .then(testPassed(done), testFailed(done));
        });
    });
});
