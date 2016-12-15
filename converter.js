'use strict'

const crypto = require('crypto');
const resolve = require('path').resolve;
const fs = require('fs');
const suffixTest = /\.json$/;
const root = resolve(process.argv[2] || '.') + '/';
const env_config = require(root + 'flow.json');
const path = root + 'composition/';
const states = {};
const files = fs.readdirSync(path);
const rdf_syntax = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const hashids = {};
const hashlbs = {};
const envs = {};
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

    parsed.name = parsed.state.toLowerCase() + '/' + parsed.path.toUpperCase();
    parsed.name = parsed.name.trim().replace(/[^a-z0-9\.\/ ]/gi, ' ');

    if (parsed.type !== '>') {
        parsed.path = getMethodIri(states[parsed.state].module, parsed.path);
    } else {
        parsed.path = '_:' + crypto.createHash('md5').update(parsed.state + parsed.path).digest('hex');
    }

    return parsed;
}

function UID (len) {
    len = len || 23;
    let i = 0, random = '';
    for (; i < len; ++i) {
        random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
    }
    return '_:' + crypto.createHash('md5').update(random).digest('hex');
}


function getHash (string) {
    let hash = '_:' + crypto.createHash('md5').update(string).digest('hex');
    if (!hashids[hash]) {
        hashids[hash] = 1;
        write(hash, rdf_syntax + 'string', '"' + string.replace(/"/g, '\\"') + '"');
    }

    return hash;
}

// create network triple
const network_id = '_:' + crypto.createHash('md5').update(env_config.network).digest('hex');

// network name (Service)
write(
    network_id,
    'http://schema.org/name',
    getHash(env_config.network)
);

// network type
write(
    network_id,
    rdf_syntax + 'type',
    '<http://schema.jillix.net/vocab/Network>'
);

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

// create env objects
if (env_config) {

    if (env_config.environments) {
        env_config.environments.forEach(env => {
            envs[env.name] = getHash(env.name);

            // environment name
            write(
                envs[env.name],
                'http://schema.org/name',
                envs[env.name]
            );

            // environment vars
            write(
                envs[env.name],
                'http://schema.jillix.net/vocab/json',
                getHash(JSON.stringify(env.vars))
            );

            // environment type
            write(
                envs[env.name],
                rdf_syntax + 'type',
                '<http://schema.jillix.net/vocab/Environment>'
            );
        });
    }

    if (env_config.entrypoints) {
        env_config.entrypoints.forEach(ep => {

            const entrypoint_id = UID();

            // network entrypoint
            write(
                network_id,
                'http://schema.jillix.net/vocab/entrypoint',
                entrypoint_id
            );

            // entrypoint name
            write(
                entrypoint_id,
                'http://schema.org/name',
                getHash(ep.name)
            );

            // entrypoint type
            write(
                entrypoint_id,
                rdf_syntax + 'type',
                '<http://schema.jillix.net/vocab/Entrypoint>'
            );

            // entrypoint environment
            if (ep.env) {
                ep.env.forEach(env => {
                    if (envs[env]) {
                        write(
                            entrypoint_id,
                            'http://schema.jillix.net/vocab/environment',
                            envs[env]
                        );
                    }
                });
            }

            // entrypoint sequence
            write(
                entrypoint_id,
                'http://schema.jillix.net/vocab/sequence',
                '_:' + crypto.createHash('md5').update(ep.emit.replace('/', '')).digest('hex')
            );
        });
    }
}

// sequences
for (let name in states) {
    let state = states[name];

    if (!state.flow) {
        continue;
    }

    // sequence
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
                '_:' + crypto.createHash('md5').update(state.flow[sequence].e.replace('/', '')).digest('hex')
            );
        }

        // error event
        if (state.flow[sequence].r) {
            write(
                sequence_id,
                'http://schema.jillix.net/vocab/onError',
                '_:' + crypto.createHash('md5').update(state.flow[sequence].r.replace('/', '')).digest('hex')
            );
        }

        // handlers
        if (state.flow[sequence].d) {
            let previous;

            // handler
            state.flow[sequence].d.forEach((handler, index) => {

                let handler_id = UID();
                let args;

                if (typeof handler === 'string') {
                    handler = handler;
                    args = null;
                } else {
                    args = handler[1];
                    handler = handler[0];
                }

                handler = parseHandler(state.name, handler);

                // name
                write(
                    handler_id,
                    'http://schema.org/name',
                    getHash(handler.name) 
                );

                // state
                write(
                    handler_id,
                    'http://schema.jillix.net/vocab/state',
                    getHash(handler.state) 
                );

                switch (handler.type) {
                    case '.':
                    case ':':
                        // type data
                        write(
                            handler_id,
                            rdf_syntax + 'type',
                            '<http://schema.jillix.net/vocab/Data>'
                        );

                        // function
                        write(
                            handler_id,
                            'http://schema.jillix.net/vocab/fn',
                            handler.path
                        );
                        break;
                    case '*':
                        // type stream
                        write(
                            handler_id,
                            rdf_syntax + 'type',
                            '<http://schema.jillix.net/vocab/Stream>'
                        );

                        // function
                        write(
                            handler_id,
                            'http://schema.jillix.net/vocab/fn',
                            handler.path
                        );
                        break;

                    case '>':

                        // type Emit
                        write(
                            handler_id,
                            rdf_syntax + 'type',
                            '<http://schema.jillix.net/vocab/Emit>'
                        );

                        // sequence
                        write(
                            handler_id,
                            'http://schema.jillix.net/vocab/sequence',
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

                // method args
                if (args) {
                    args = JSON.stringify(args);

                    // potential emits from args
                    let potential_emits = args.match(/\{FLOW\:([^\}]+)\}/g);
                    let emits = [];
                    if (potential_emits) {
                        potential_emits.forEach(emit => {
                            let replace = emit;
                            emit = emit.slice(6, -1).replace('/', '');
                            emit = '_:' + crypto.createHash('md5').update(emit).digest('hex');
                            args = args.replace(replace, emit);
                            emits.push(emit); 
                        });
                    }

                    let args_hid = getHash(args);
                    let args_uid = UID();
                    let args_lbl = "Args";

                    // handler args connection
                    write(
                        handler_id,
                        'http://schema.jillix.net/vocab/args',
                        args_uid
                    );

                    // arg object
                    write(
                        args_uid,
                        'http://schema.jillix.net/vocab/json',
                        args_hid
                    );

                    // args type
                    write(
                        args_uid,
                        rdf_syntax + 'type',
                        '<http://schema.jillix.net/vocab/Arguments>'
                    );

                    // args name
                    write(
                        args_uid,
                        'http://schema.org/name',
                        getHash('Args')
                    );

                    emits.forEach(emit => {
                        let key = args_uid + emit;
                        if (!temp_index[key]) {
                            temp_index[key] = 1;
                            write(
                                args_uid,
                                'http://schema.jillix.net/vocab/sequence',
                                emit
                            );
                        }
                    });
                }
            });
        }
    }
}
