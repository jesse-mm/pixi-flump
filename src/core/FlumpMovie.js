"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AnimationQueue_1 = require("../util/AnimationQueue");
var QueueItem_1 = require("../util/QueueItem");
var MovieLayer_1 = require("../core/MovieLayer");
var FlumpMovie = (function (_super) {
    __extends(FlumpMovie, _super);
    function FlumpMovie(library, name) {
        _super.call(this);
        this._labels = {};
        this._queue = null;
        this.hasFrameCallbacks = false;
        this.paused = true;
        this.frame = 0;
        this.frames = 0;
        this.speed = 1;
        this.fps = 1;
        this.name = name;
        this._library = library;
        this._movieData = library.getMovieData(name);
        var layers = this._movieData.layerData;
        var length = layers.length;
        var movieLayers = new Array(length);
        for (var i = 0; i < length; i++) {
            var layerData = layers[i];
            movieLayers[i] = new MovieLayer_1.MovieLayer(i, this, library, layerData);
            this.addChild(movieLayers[i]);
        }
        this._movieLayers = movieLayers;
        this.frames = this._movieData.frames;
        this._frameCallback = new Array(this.frames);
        for (var i = 0; i < this.frames; i++) {
            this._frameCallback[i] = null;
        }
        this.fps = library.frameRate;
        this.getQueue();
    }
    FlumpMovie.prototype.setLabel = function (name, data) {
        this._labels[name] = data;
    };
    FlumpMovie.prototype.getQueue = function () {
        if (!this._queue) {
            this._queue = new AnimationQueue_1.AnimationQueue(this.fps, 1000);
        }
        return this._queue;
    };
    FlumpMovie.prototype.play = function (times, label, complete) {
        if (times === void 0) { times = 1; }
        if (label === void 0) { label = null; }
        this.visible = true;
        if (label instanceof Array) {
            if (label.length == 1) {
                var queue = new QueueItem_1.QueueItem(null, label[0], this.frames, times, 0);
            }
            else {
                var queue = new QueueItem_1.QueueItem(null, label[0], label[1], times, 0);
            }
        }
        else if (label == null || label == '*') {
            var queue = new QueueItem_1.QueueItem(null, 0, this.frames, times, 0);
        }
        else {
            var queueLabel = this._labels[label];
            if (!queueLabel) {
                throw new Error('unknown label:' + queueLabel + ' | ' + this.name);
            }
            var queue = new QueueItem_1.QueueItem(queueLabel.label, queueLabel.index, queueLabel.duration, times, 0);
        }
        if (complete) {
            queue.then(complete);
        }
        this._queue.add(queue);
        if (complete) {
            queue.then(complete);
        }
        this.paused = false;
        return this;
    };
    FlumpMovie.prototype.resume = function () {
        this.paused = false;
        return this;
    };
    FlumpMovie.prototype.pause = function () {
        this.paused = true;
        return this;
    };
    FlumpMovie.prototype.end = function (all) {
        if (all === void 0) { all = false; }
        this._queue.end(all);
        return this;
    };
    FlumpMovie.prototype.stop = function () {
        this.paused = true;
        this._queue.kill();
        return this;
    };
    FlumpMovie.prototype.next = function () {
        return this._queue.next();
    };
    FlumpMovie.prototype.kill = function () {
        this._queue.kill();
        return this;
    };
    FlumpMovie.prototype.setFrameCallback = function (frameNumber, callback, triggerOnce) {
        var _this = this;
        if (triggerOnce === void 0) { triggerOnce = false; }
        this.hasFrameCallbacks = true;
        if (triggerOnce) {
            this._frameCallback[frameNumber] = function (delta) {
                callback.call(_this, delta);
                _this.setFrameCallback(frameNumber, null);
            };
        }
        else {
            this._frameCallback[frameNumber] = callback;
        }
        return this;
    };
    FlumpMovie.prototype.gotoAndStop = function (frameOrLabel) {
        var frame;
        if (typeof frameOrLabel === 'string') {
            frame = this._labels[frameOrLabel].index;
        }
        else {
            frame = frameOrLabel;
        }
        var queue = new QueueItem_1.QueueItem(null, frame, 1, 1, 0);
        this._queue.add(queue);
        return this;
    };
    FlumpMovie.prototype.onTick = function (delta, accumulated) {
        var movieLayers = this._movieLayers;
        delta *= this.speed;
        if (this.paused == false) {
            this._queue.onTick(delta);
            var frame = this.frame;
            var newFrame = this._queue.getFrame();
            for (var i = 0; i < movieLayers.length; i++) {
                var layer = movieLayers[i];
                layer.onTick(delta, accumulated);
                layer.setFrame(newFrame);
            }
            this.frame = newFrame;
        }
    };
    FlumpMovie.prototype.getSymbol = function (name) {
        var layers = this._movieLayers;
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var symbol = layer.getSymbol(name);
            if (symbol != null) {
                return symbol;
            }
        }
        return null;
    };
    FlumpMovie.prototype.replaceSymbol = function (name, symbol) {
        var layers = this._movieLayers;
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            if (layer.replaceSymbol(name, symbol)) {
                return true;
            }
        }
        return false;
    };
    FlumpMovie.prototype.handleFrameCallback = function (fromFrame, toFrame, delta) {
        if (toFrame > fromFrame) {
            for (var index = fromFrame; index < toFrame; index++) {
                if (this._frameCallback[index]) {
                    this._frameCallback[index].call(this, delta);
                }
            }
        }
        else if (toFrame < fromFrame) {
            for (var index = fromFrame; index < this.frames; index++) {
                if (this._frameCallback[index]) {
                    this._frameCallback[index].call(this, delta);
                }
            }
            for (var index = 0; index < toFrame; index++) {
                if (this._frameCallback[index]) {
                    this._frameCallback[index].call(this, delta);
                }
            }
        }
        return this;
    };
    FlumpMovie.prototype.reset = function () {
        var layers = this._movieLayers;
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            layer.reset();
        }
    };
    return FlumpMovie;
}(PIXI.Container));
exports.FlumpMovie = FlumpMovie;
