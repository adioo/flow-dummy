'use strict'

const crypto = require('crypto');
const resolve = require('path').resolve;
const fs = require('fs');
const suffixTest = /\.json$/;
const root = resolve(process.argv[2] || '/home/adioo/Repos') + '/';
const path = root + 'composition/';
const states = {};
const files = fs.readdirSync(path);
const type = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const dependencies = {};

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

for (let state in states) {
    Convert(states[state]);
}

/*for (let from in dependencies) {
    for (let to in dependencies[from]) {
        write(from, 'http://schema.jillix.net/vocab/dependency', to);
    }
}*/

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

    return owner + '/' + module + '?' + method;
}

function write (subject, predicate, object) {
    process.stdout.write(subject + ' <' + predicate + '> ' + object + ' .\n');
}

function extendInstance (state, path) {
    path = path.split('/');
    let parsed = {
        type: path[0][0]
    };
    path[0] = path[0].substr(1);

    if (path.length > 1) {
        parsed.state = path[0];
        parsed.path = path[1];
    } else {
        parsed.state = state;
        parsed.path = path[0]
    }

    if (parsed.type !== '>') {
        parsed.path = getMethodIri(states[parsed.state].module, parsed.path);
    } else {
        //parsed.path = '_:' + crypto.createHash('md5').update(parsed.state + '/' + parsed.path).digest('hex');
        parsed.path = parsed.state + '/' + parsed.path;
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

function Convert (state) {
    if (!state.flow) {
        return;
    }

    for (let sequence in state.flow) {
        //let sequence_id = '_:' + crypto.createHash('md5').update(state.name + '/' + sequence).digest('hex');
        let sequence_id = '_:' + state.name + '/' + sequence;

        write(
            sequence_id,
            'http://schema.org/name',
            '"' + sequence + '"'
        );

        // TODO add sequence to cluster
        /*write(
            sequence_id,
            'http://schema.jillix.net/vocab/cluster',
            cluster_id
        );
        //if (state.name !== path.instance) {
            //dependencies[state.name] = dependencies[state.name] || {};
            //dependencies[state.name]['<' + path.instance + '>'] = 1;
        //}
        */

        // roles
        if (state.roles) {
            for (let role in state.roles) {
                write(
                    sequence_id,
                    'http://schema.jillix.net/vocab/roles',
                    '"' + role + '"'
                );
            }
        }

        // type
        write(
            sequence_id,
            type,
            '<http://schema.jillix.net/vocab/Sequence>'
        );

        // end event
        if (state.flow[sequence].e) {
            write(
                sequence_id,
                'http://schema.jillix.net/vocab/onEnd',
                state.flow[sequence].e
            );
        }

        // error event
        if (state.flow[sequence].r) {
            write(
                sequence_id,
                'http://schema.jillix.net/vocab/onError',
                state.flow[sequence].r
            );
        }

        // sequence
        if (state.flow[sequence].d) {
            let previous;
            state.flow[sequence].d.forEach((handler, index) => {

                let handler_id = '_:' + UID(8);
                let path;
                let args;

                write(
                    index === 0 ? sequence_id : previous,
                    'http://schema.jillix.net/vocab/next',
                    handler_id
                );
                previous = handler_id;

                if (typeof handler === 'string') {
                    path = handler;
                    args = null;
                } else {
                    path = handler[0];
                    args = handler[1];
                }

                path = extendInstance(state.name, path); 

                write(
                    handler_id,
                    'http://schema.jillix.net/vocab/sequence',
                    sequence_id
                );

                write(
                    handler_id,
                    type,
                    '<http://schema.jillix.net/vocab/Handler>'
                );

                // TODO does this generate redudant args objects?
                if (args) {
                    write(
                        handler_id,
                        'http://schema.jillix.net/vocab/args',
                        '"' + JSON.stringify(args).replace(/"/g, '\\"') + '"'
                    );
                }

                write(
                    handler_id,
                    'http://schema.jillix.net/vocab/state',
                    '"' + path.state + '"'
                );

                switch (path.type) {
                    case '.':
                    case ':':
                        write(
                            handler_id,
                            'http://schema.jillix.net/vocab/data',
                            path.path
                        );
                        break;
                    case '*':
                        write(
                            handler_id,
                            'http://schema.jillix.net/vocab/stream',
                            path.path
                        );
                        break;

                    case '>':
                        write(
                            handler_id,
                            'http://schema.jillix.net/vocab/emit',
                            path.path
                        );
                        break;
                }
            });
        }
    }
}
