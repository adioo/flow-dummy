'use strict'

const crypto = require('crypto');
const resolve = require('path').resolve;
const fs = require('fs');
const suffixTest = /\.json$/;
const root = resolve(process.argv[2] || '.') + '/';
const path = root + 'composition/';
const states = {};
const files = fs.readdirSync(path);
const rdf_syntax = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const hashids = {};
const entrypoints = {};
const temp_index = {};

function write (subject, predicate, object) {
    process.stdout.write(subject + ' <' + predicate + '> ' + object + ' .\n');
}

function getMethodIri (module, method) {

    // git+https://github.com/ + module + .git
    let owner = 'jillix';
    switch (module) {
        case 'flow-view':
        case 'flow-auth':
        case 'flow-streams':
        case 'flow-visualizer':
        case 'flow-compress':
            owner = 'adioo';
            break;
        case 'flow-keypress':
        case 'flow-ace':
            owner = 'danandrei';
            break;
    }

    // TODO method descriptor
    return '<' + owner + '/' + module + '?' + method + '>';
}

function parseHandler (state, handler) {
    handler = handler.split('/');
    let parsed = {
        type: handler[0][0]
    };
    handler[0] = handler[0].substr(1);

    if (handler.length > 1) {
        parsed.state = handler[0];
        parsed.path = handler[1];
    } else {
        parsed.state = state;
        parsed.path = handler[0]
    }

    if (parsed.type !== '>') {
        parsed.path = getMethodIri(states[parsed.state].module, parsed.path);
    } else {
        parsed.path = '_:' + crypto.createHash('md5').update(parsed.state + parsed.path).digest('hex');
    }

    return parsed;
}

function UID (len) {
    len = len || 23;
    for (var i = 0, random = ''; i < len; ++i) {
        random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
    }
    return random;
}

function getHash (string) {
    let hash = '_:' + crypto.createHash('md5').update(string).digest('hex');
    if (!hashids[hash]) {
        hashids[hash] = 1;
        write(hash, rdf_syntax + 'string', '"' + string.replace(/"/g, '\\"') + '"');
    }

    return hash;
}

// Convert composition files to triples
files.forEach(file => {

    if (!suffixTest.test(file)) {
        return;
    }

    try {
        let state = JSON.parse(fs.readFileSync(path + file));
        states[state.name] = state;
    } catch (error) {
        throw new Error(path + file + '\n' + error);
    }
});

for (let name in states) {
    let state = states[name];

    if (!state.flow) {
        continue;
    }

    for (let sequence in state.flow) {
        let sequence_id = '_:' + crypto.createHash('md5').update(state.name + sequence).digest('hex');

        // name
        write(
            sequence_id,
            'http://schema.org/name',
            getHash(state.name + '-' + sequence)
        ); 

        // type
        write(
            sequence_id,
            rdf_syntax + 'type',
            '<http://schema.jillix.net/vocab/Sequence>'
        );

        // roles
        if (state.roles) {
            for (let role in state.roles) {
                write(
                    sequence_id,
                    'http://schema.jillix.net/vocab/role',
                    getHash(role)
                );
            }
        }

        // end event
        if (state.flow[sequence].e) {
            write(
                sequence_id,
                'http://schema.jillix.net/vocab/onEnd',
                '_:' + crypto.createHash('md5').update(state.flow[sequence].e).digest('hex')
            );
        }

        // error event
        if (state.flow[sequence].r) {
            write(
                sequence_id,
                'http://schema.jillix.net/vocab/onError',
                '_:' + crypto.createHash('md5').update(state.flow[sequence].r).digest('hex')
            );
        }

        // TODO env vars
        if (entrypoints[sequence]) {
            // ..
        }

        // sequence
        if (state.flow[sequence].d) {
            let previous;
            state.flow[sequence].d.forEach((handler, index) => {

                let handler_id = '_:' + crypto.createHash('md5').update(UID(8)).digest('hex');
                let args;

                if (typeof handler === 'string') {
                    handler = handler;
                    args = null;
                } else {
                    args = handler[1];
                    handler = handler[0];
                }

                handler = parseHandler(state.name, handler); 

                // type
                write(
                    handler_id,
                    rdf_syntax + 'type',
                    '<http://schema.jillix.net/vocab/Handler>'
                );

                // method args
                if (args) {
                    args = JSON.stringify(args);
                    let args_id = getHash(args);
                    write(
                        handler_id,
                        'http://schema.jillix.net/vocab/args',
                        args_id
                    );

                    // potential emits from args
                    let potential_emits = args.match(/\{FLOW\:([^\}]+)\}/g);
                    if (potential_emits) {
                        potential_emits.forEach(emit => {
                            emit = emit.slice(6, -1).replace('/', '');
                            emit = '_:' + crypto.createHash('md5').update(emit).digest('hex');
                            let triple = args_id + 'emit' + emit;
                            if (!temp_index[triple]) {
                                temp_index[triple] = 1;
                                write(
                                    args_id,
                                    'http://schema.jillix.net/vocab/emit',
                                    emit
                                );
                            }
                        });
                    }
                }

                // state
                write(
                    handler_id,
                    'http://schema.jillix.net/vocab/state',
                    getHash(handler.state)
                );

                switch (handler.type) {
                    case '.':
                    case ':':
                        // method (data)
                        write(
                            handler_id,
                            'http://schema.jillix.net/vocab/data',
                            handler.path
                        );
                        break;
                    case '*':
                        // method (stream)
                        write(
                            handler_id,
                            'http://schema.jillix.net/vocab/stream',
                            handler.path
                        );
                        break;

                    case '>':
                        // emit
                        write(
                            handler_id,
                            'http://schema.jillix.net/vocab/emit',
                            handler.path
                        );
                        break;
                }

                // next
                write(
                    index === 0 ? sequence_id : previous,
                    'http://schema.jillix.net/vocab/next',
                    handler_id
                );

                previous = handler_id;

                // link back to sequence (owner)
                write(
                    sequence_id,
                    'http://schema.jillix.net/vocab/handler',
                    handler_id
                );
            });
        }
    }
}
