"use strict"

const Transform = require('stream').Transform;

exports.multiplyMe = () => {

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

    return logger;
};
