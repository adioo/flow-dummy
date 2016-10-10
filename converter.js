'use strict'

// TODO module descriptors

const fs = require('fs');
const root = '/home/adioo/Repos/service/';
const path = root + 'composition/';
const npm_pack = require(root + 'package.json');
const instances = {};
const files = fs.readdirSync(path);
const domain = 'https://static.jillix.com/';
const type = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const dependencies = {};

files.forEach(file => {
    let instance = JSON.parse(fs.readFileSync(path + file));
    instances[instance.name] = instance;
});
for (let instance in instances) {
    Convert(instances[instance]);
}

for (let from in dependencies) {
    for (let to in dependencies[from]) {
        write(from, 'http://schema.jillix.net/vocab/dependency', to);
    }
}

function write (subject, predicate, object) {
    process.stdout.write(subject + ' <' + predicate + '> ' + object + ' .\n');
}

function getModuleIri (instance, method) {
    let module = instances[instance].module;
    let owner = 'jillix';

    if (module === 'view') {
        owner = 'adioo';
    }

    if (method) {
        return '<https://raw.githubusercontent.com/' + owner + '/' + module + '/master/module.json#' + method + '>';
    } else {
        return '<https://raw.githubusercontent.com/' + owner + '/' + module + '/master/module.json>';
    }
}

function extendInstance (instance, path) {
    path = path.split('/');
    let parsed = {
        type: path[0][0]
    };
    path[0] = path[0].substr(1);

    if (path.length > 1) {
        parsed.instance = path[0];
        parsed.path = path[1];
    } else {
        parsed.instance = instance;
        parsed.path = path[0]
    }

    if (parsed.type !== '>') {
        parsed.path = getModuleIri(parsed.instance, parsed.path);
    } else {
        parsed.path = '<' + domain + parsed.instance + '/' + parsed.path + '>';
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

function Convert (instance) {
    let instance_name = '<' + domain + instance.name + '>';

    if (instance.name) {
        write(
            instance_name,
            'http://schema.org/name',
            '"\\"' + instance.name + '\\""'
        );
    }

    write(
        instance_name,
        type,
        '<http://schema.jillix.net/vocab/ModuleInstanceConfig>'
    );

    // module
    if (instance.module) {
        write(
            instance_name,
            'http://schema.jillix.net/vocab/module',
            getModuleIri(instance.name)
        );
    }

    // roles
    if (instance.roles) {
        for (let role in instance.roles) {
            write(
                instance_name,
                'http://schema.jillix.net/vocab/roles',
                '"\\"' + role + '\\""'
            );
        }
    }

    // args
    if (instance.config) {
        write(
            instance_name,
            'http://schema.jillix.net/vocab/args',
            '"\\"' + JSON.stringify(instance.config).replace(/"/g, '\\"') + '\\""'
        );
    }

    //flow
    if (instance.flow) {
        for (let event in instance.flow) {
            let event_iri = '<' + domain + instance.name + '/' + event + '>';
            write(
                event_iri,
                'http://schema.org/name',
                '"\\"' + event + '\\""'
            );

            write(
                instance_name,
                'http://schema.jillix.net/vocab/event',
                event_iri
            );

            write(
                event_iri,
                type,
                '<http://schema.jillix.net/vocab/FlowEvent>'
            );

            // end event
            if (instance.flow[event].e) {
                write(
                    event_iri,
                    'http://schema.jillix.net/vocab/onEnd',
                    '<' + domain + instance.flow[event].e + '>'
                );
            }

            // error event
            if (instance.flow[event].r) {
                write(
                    event_iri,
                    'http://schema.jillix.net/vocab/onError',
                    '<' + domain + instance.flow[event].r + '>'
                );
            }

            // sequence
            if (instance.flow[event].d) {
                let previous;
                instance.flow[event].d.forEach((handler, index) => {

                    let handler_id = '_:' + UID(8);
                    let path;
                    let args;

                    write(
                        index === 0 ? event_iri : previous,
                        'http://schema.jillix.net/vocab/sequence',
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

                    path = extendInstance(instance.name, path);
                    if (instance.name !== path.instance) {
                        dependencies[instance_name] = dependencies[instance_name] || {};
                        dependencies[instance_name]['<' + domain + path.instance + '>'] = 1;
                    }

                    write(
                        handler_id,
                        'http://schema.jillix.net/vocab/event',
                        event_iri
                    );

                    write(
                        handler_id,
                        type,
                        '<http://schema.jillix.net/vocab/Sequence>'
                    );

                    if (args) {
                        write(
                            handler_id,
                            'http://schema.jillix.net/vocab/args',
                            '"\\"' + JSON.stringify(args).replace(/"/g, '\\"') + '\\""'
                        );
                    }

                    if (path.type !== '>') {
                        write(
                            handler_id,
                            'http://schema.jillix.net/vocab/instance',
                            '<' + domain + path.instance + '>'
                        );
                    }

                    switch (path.type) {
                        case '.':
                            write(
                                handler_id,
                                'http://schema.jillix.net/vocab/onceHandler',
                                path.path
                            );
                            break;

                        case ':':
                            write(
                                handler_id,
                                'http://schema.jillix.net/vocab/dataHandler',
                                path.path
                            );
                            break;
                        case '*':
                            write(
                                handler_id,
                                'http://schema.jillix.net/vocab/streamHandler',
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
}
