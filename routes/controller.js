/*
 * Copyright (c) 2014, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jshint node:true */
'use strict';

var fs = require('fs');
var path = require('path');
var argv = require('yargs').argv;
var FakeResponse = require('./../libs/fakeresponse.js');
var ResponseDescBuilder = require('../libs/responseDescBuilder.js');
var merge = require('merge');

var controller = {
    fakeResponse: FakeResponse, // of course this is here just so that it can be overwritten easily in the tests.
    defaultRoutesDir: argv.defaultRoutesDir,

    add: function (req, res, next) {
        console.log('INFO: Adding route :: ' + req.params.route);
        try {
            var responseDesc = new ResponseDescBuilder(req.params.route)
                .withQueryParams(req.params.queryParams)
                .withHeaders(req.params.requiredHeaders)
                .withPayload(req.params.payload)
                .sendResponseBody(req.params.responseBody)
                .sendResponseData(req.params.responseData)
                .sendResponseCode(req.params.responseCode)
                .sendResponseHeaders(req.params.responseHeaders)
                .delayResponseBy(req.params.delay)
                .respondAtCall(req.params.at);

            controller.fakeResponse.add(responseDesc);

            res.send(200, 'OK');
        } catch (error) {
            res.send(204, error.message);
        }
        next();
    },

    match: function (req, res, next) {
        console.log('INFO: Matching route :: ' + req.url);

        function send(statusCode, responseHeaders, responseBody) {
            var contentTypeApplicationJson = {"Content-Type": "application/json"};
            var contentTypeTextHtml = {"Content-Type": "text/html"};

            if (typeof responseBody === "object") {
                try {
                    responseBody = JSON.stringify(responseBody);
                    responseHeaders = merge(contentTypeApplicationJson, responseHeaders)
                } catch (e) {
                    responseBody = "Unable to serialize responseBody";
                    responseHeaders = contentTypeTextHtml;
                    res.statusCode = 500;
                }
            } else {
                responseHeaders = merge(contentTypeTextHtml, responseHeaders);
            }
            responseHeaders['Content-Length'] = Buffer.byteLength(responseBody);

            res.writeHead(statusCode, responseHeaders);
            res.write(responseBody);
            res.end();
        }

        var bestMatch = controller.fakeResponse.match(req.url, req.body, req.headers);
        if (bestMatch) {
            var sendBestMatchResponse = function () {
                if (bestMatch.responseData) {
                    fs.readFile(path.join(bestMatch.responseData), 'utf8', function (err, data) {
                        if (err) {
                            res.send(500, "Error reading file at " + path.resolve(bestMatch.responseData));
                        }
                        try {
                            data = JSON.parse(data);
                        } catch (e) {
                            console.log("INFO: Unable to parse to JSON. Falling back to read file as text from " + path.resolve(bestMatch.responseData))
                        }
                        send(parseInt(bestMatch.responseCode, 10), bestMatch.responseHeaders, data);
                    });
                } else if (bestMatch.responseBody == '' || bestMatch.responseBody) {
                    send(parseInt(bestMatch.responseCode, 10), bestMatch.responseHeaders, bestMatch.responseBody);
                } else {
                    next();
                }
            };

            if (bestMatch.delay) {
                setTimeout(sendBestMatchResponse, bestMatch.delay);
            } else {
                sendBestMatchResponse()
            }

        } else {
            res.send(404, 'no match!');
            next();
        }
    },

    remove: function (req, res, next) {
        console.log('INFO: Removing route :: ' + req.params.route);

        var uri = req.params.route;
        if (req.params.queryParams) {
            var allParameters = Object.keys(req.params.queryParams);
            var params = allParameters.map(function (parameterName) {
                return parameterName + '=' + req.params.queryParams[parameterName]
            }).join('&');

            uri = uri.concat('?').concat(params);
        }

        if (controller.fakeResponse.remove(uri, req.params.payload, req.params.requiredHeaders))
            res.send(200, 'OK');
        else
            res.send(409, 'NOT OK');
        next();
    },

    flush: function (req, res, next) {
        console.log('INFO: Flushing all the routes :: ');

        controller.fakeResponse.flush();
        controller.fakeResponse.preload(controller.defaultRoutesDir); // todo: Handle error
        res.send(200, 'OK');
        next();
    }
};

module.exports = function (defaultRoutesPath) {
    controller.defaultRoutesDir = argv.defaultRoutesDir || defaultRoutesPath;
    FakeResponse.preload(controller.defaultRoutesDir);
    return controller;
};