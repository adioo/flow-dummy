const Transform = require('stream').Transform;
const inspect = require('util').inspect;

exports.test = (event, state, args, next) => {

    process.stdout.write("Please enter a number to multiply: ");

    const logger = new Transform({
        transform: (chunk, enc, done) => {
            let value = parseInt(chunk.toString());
            if (!isNaN(value)) {
                value = value * value;
            } else {
                value = "Can not multiply ignorance!";
            }

            done(null, "Result: " + value + "\nNext number: ");
        }
    });

    next(null, event.data, event.output.pipe(logger));
};
