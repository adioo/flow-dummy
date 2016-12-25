'use strict'

const crypto = require('crypto');
const resolve = require('path').resolve;
const fs = require('fs');
const suffixTest = /\.json$/;
const root = resolve(process.argv[2] || '.') + '/';
const env_config = require(root + 'flow.json');
//const path = root + 'composition/';
const path = root + 'network/';
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

/*
function getMethodIri (module, method) {

    // git+https://github.com/ + module + .git
    let owner = 'jillix';
    switch (module) {
        case 'flow-view':
        case 'flow-auth':
        case 'flow-streams':
        case 'flow-visualizer':
        case 'flow-compress':
        case 'flow-dummy':
            owner = 'adioo';
            break;
        case 'flow-keypress':
        case 'flow-ace':
            owner = 'danandrei';
            break;
    }

    // TODO method descriptor
    //return '<' + owner + '/' + module + '?' + method + '>';
    return [owner, module, method];
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
        //parsed.path = '_:' + crypto.createHash('md5').update(parsed.state + parsed.path).digest('hex');
        parsed.path = parsed.state + '/' + parsed.path;
    }

    return parsed;
}
*/

function UID (len) {
    len = len || 23;
    let i = 0, random = '';
    for (; i < len; ++i) {
        random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
    }
    return '_:' + crypto.createHash('md5').update(random).digest('hex');
}


function getHash (string, name) {
    let hash = '_:' + crypto.createHash('md5').update(string).digest('hex');
    if (!hashids[hash]) {
        hashids[hash] = 1;
        write(hash, rdf_syntax + 'string', '"' + string.replace(/"/g, '\\"') + '"');

        if (name) {
            write(hash, 'http://schema.org/name', getHash(name));
        }
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

    let state;
    try {
        state = JSON.parse(fs.readFileSync(path + file));
    } catch (error) {
        throw new Error(path + file + '\n' + error);
    }

    //states[state.name] = state; 
    states[file] = state; 
});

// create env objects
if (env_config) {

    if (env_config.environments) {
        env_config.environments.forEach(env => {
            envs[env.name] = getHash(JSON.stringify(env.vars), env.name);
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
                '_:' + crypto.createHash('md5').update(ep.emit).digest('hex')
            );
        });
    }
}

// sequences
for (let name in states) {

    /*const result = {};
    const state = states[name];
    for (let seq in state.flow) {
        let data = state.flow[seq].d;
        let error = state.flow[seq].r;
        let sequence = state.name + '/' + seq;

        // add sequence to the result
        if (result[sequence]) {
            throw new Error('Converter: Redundant sequence name: ' + sequence);
        }
        result[sequence] = [[]];
        if (error) {
            result[sequence][1] = error;
        }

        let fn, _handler;
        data.forEach((handler) => {
            let args;
            if (typeof handler === 'string') {
                fn = parseHandler(state.name, handler);
            } else {
                fn = parseHandler(state.name, handler[0]);
                args = handler[1];
            }

            // handler
            if (fn.type !== '>') {
                _handler = [fn.path[0], fn.path[1], fn.path[2], fn.state];

                if (args) {
                    _handler.push(args);
                }

            // emits
            } else {
                _handler = fn.path;
            }

            result[sequence][0].push(_handler);
        });
        
    }

    fs.writeFile(root + 'network/' + name + '.json', JSON.stringify(result, null, '    '), (err) => {
        if (err) throw err;
    });
    continue;*/

    // sequence
    for (let sequence in states[name]) {
        let seq = states[name][sequence];
        let sequence_id = '_:' + crypto.createHash('md5').update(sequence).digest('hex');

        // name
        write(
            sequence_id,
            'http://schema.org/name',
            getHash(sequence)
        ); 

        // type
        write(
            sequence_id,
            rdf_syntax + 'type',
            '<http://schema.jillix.net/vocab/Sequence>'
        );

        // roles
        write(
            sequence_id,
            'http://schema.jillix.net/vocab/role',
            getHash('*')
        );

        // end event
        if (seq[2]) {
            write(
                sequence_id,
                'http://schema.jillix.net/vocab/onEnd',
                '_:' + crypto.createHash('md5').update(seq[2]).digest('hex')
            );
        }

        // error event
        if (seq[1]) {
            write(
                sequence_id,
                'http://schema.jillix.net/vocab/onError',
                '_:' + crypto.createHash('md5').update(seq[1]).digest('hex')
            );
        }

        // handlers
        let previous;

        // handler
        seq[0].forEach((handler, index) => {

            let handler_id = UID();
            let handler_name = typeof handler === 'string' ? handler : handler[1] + '/' + handler[2];

            // name
            write(
                handler_id,
                'http://schema.org/name',
                getHash(handler_name) 
            );

            // sequence emit
            if (typeof handler === 'string') {

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
                    '_:' + crypto.createHash('md5').update(handler).digest('hex')
                );

            // data handler
            } else {

                // state
                write(
                    handler_id,
                    'http://schema.jillix.net/vocab/state',
                    getHash(handler[3]) 
                );

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
                    '<' + handler[0] + '/' + handler[1] + '?' + handler[2] + '>'
                );
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
            if (handler[4]) {
                let args = JSON.stringify(handler[4]);

                // potential emits from args
                let potential_emits = args.match(/\{FLOW\:([^\}]+)\}/g);
                let emits = [];
                if (potential_emits) {
                    potential_emits.forEach(emit => {
                        let replace = emit;
                        emit = emit.slice(6, -1);
                        emit = '_:' + crypto.createHash('md5').update(emit).digest('hex');
                        args = args.replace(replace, emit);
                        emits.push(emit); 
                    });
                }

                let args_hid = getHash(args, "Args:" + handler[2]);

                // handler args connection
                write(
                    handler_id,
                    'http://schema.jillix.net/vocab/args',
                    args_hid
                );

                emits.forEach(emit => {
                    let key = args_hid + emit;
                    if (!temp_index[key]) {
                        temp_index[key] = 1;
                        write(
                            args_hid,
                            'http://schema.jillix.net/vocab/sequence',
                            emit
                        );
                    }
                });
            }
        });
    }
}
