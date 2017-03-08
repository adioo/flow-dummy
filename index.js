const Transform = require('stream').Transform;
const inspect = require('util').inspect;

module.exports = (event, state, args, next) => {

    inspect(event.data);

    const logger = new Transfrom({
        transform: (chunk, enc, done) => {
            inspect(chunk);
            done(null, chunk);
        }
    });

    next(null, event.data, event.output.pipe(logger));
};
