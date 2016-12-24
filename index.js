const Transform = require('stream').Transform;
const util = require('util');

exports.data = function (scope, state, args, chunk, next) {
    //console.log('Dummy.data:', this._name, chunk);
    next(null, chunk);
    //next(new Error('Hello, Error!'));
};

exports.stream = function (args, stream) {
    const self = this;
    return new Transform({
        objectMode: args.objectMode !== undefined ? args.objectMode : true,
        transform: (chunk, enc, next) => {
            console.log('Dummy.stream.data:', self._name, chunk);
            next(null, chunk);
            //next(new Error('Hello, Error!'));
        }
    });
};
