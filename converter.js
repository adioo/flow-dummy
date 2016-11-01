'use strict'

// TODO module descriptors
const suffixTest = /\.json$/;
const resolve = require('path').resolve;
const fs = require('fs');
const root = resolve(process.argv[2] || '/home/adioo/Repos') + '/';
const path = root + 'composition/';
const instances = {};
const files = fs.readdirSync(path);
const domain = '';//'https://static.jillix.com/'
const type = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const dependencies = {};
const modules = [
    "flow-app",
    "flow-browser",
    "flow-http",
    "flow-pack",
    "flow-router",
    "flow-service-api",
    "flow-tools",
    "flow-static",
    "flow-schema",
    "flow-url",
    "flow-sendgrid",
    "flow-auth",
    "flow-view",
    "flow-api",
    "flow-visualizer",
    "flow-remodal",
    "builder",
    "schema"
];

modules.forEach(dep => {

    let owner = 'jillix';
    let branch = '#flow_v0.1.0';
    switch (dep) {
        case 'flow-view':
        case 'flow-auth':
            owner = 'adioo';
            break;
        case 'flow-visualizer':
            owner = 'adioo';
            branch = '';
            break;
    }

    write(
        '<' + owner + '/' + dep  + '>',
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        '<http://schema.jillix.net/vocab/Module>'
    );

    write(
        '<' + owner + '/' + dep  + '>',
        'http://schema.jillix.net/vocab/gitRepository',
        '"git+https://github.com/' + owner + '/' + dep + '.git' + branch + '"'
    );

    write(
        '<' + owner + '/' + dep  + '>',
        'http://schema.org/name',
        '"' + dep + '"'
    );
});

files.forEach(file => {

    if (!suffixTest.test(file)) {
        return;
    }

    try {
        let instance = JSON.parse(fs.readFileSync(path + file));
        instances[instance.name] = instance;
    } catch (error) {
        throw new Error(path + file + '\n' + error);
    }
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

    switch (module) {
        case 'flow-view':
        case 'flow-auth':
        case 'flow-visualizer':
            owner = 'adioo';
            break;
    }

    if (method) {
        return '<' + owner + '/' + module + '#' + method + '>';
    } else {
        return '<' + owner + '/' + module + '>';
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
            '"' + instance.name + '"'
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
                '"' + role + '"'
            );
        }
    }

    // args
    if (instance.config) {
        write(
            instance_name,
            'http://schema.jillix.net/vocab/args',
            '"' + JSON.stringify(instance.config).replace(/"/g, '\\"') + '"'
        );
    }

    //flow
    if (instance.flow) {
        for (let event in instance.flow) {
            let event_iri = '<' + domain + instance.name + '/' + event + '>';
            write(
                event_iri,
                'http://schema.org/name',
                '"' + event + '"'
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
                            '"' + JSON.stringify(args).replace(/"/g, '\\"') + '"'
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
