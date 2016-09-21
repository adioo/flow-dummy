const PassThrough = require('stream').PassThrough;

exports.init = (args, ready) => {
    ready();
};

exports.data = (args, chunk, next) => {
    next(null, chunk);
};

exports.stream = () => {
    return new PassThrough();
};
