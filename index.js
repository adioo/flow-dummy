const Transform = require('stream').Transform;
const util = require('util');

exports.init = function (args, ready) {
    console.log('Dummy.init:', this._name);
    ready();
    //ready(new Error('Hello, Error!'));
};

exports.data = function (args, chunk, next) {
    console.log('Dummy.data:', this._name, chunk);
    next(null, chunk);
};

exports.stream = function (args, stream) {
    const self = this;
    return new Transform({
        objectMode: args.objectMode !== undefined ? args.objectMode : true,
        transform: (chunk, enc, next) => {
            console.log('Dummy.stream.data:', self._name, chunk);
            next(null, chunk);
        }
    });
};
