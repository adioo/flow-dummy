'use strict'

const num_instances = process.argv[2] || 42;
const instances = [];
const events = [];
const dependencies = [];
const domain = '<http://doma.in/_i/';
const iri_end = '> ';
const onEnd = domain + 'INSTANCE/onEnd>';
const onError = domain + 'INSTANCE/onError>';

let instance;
let instance_iri;
let step;
let num_events;
let event;
let event_iri;
let current_handler;
let eStep
let num_handler;
let next_handler;
let handler_type;
let target;
let hStep;

// TODO create ids, then the triples
// TODO select onError and onEnd from cached events

// module descriptor
process.stdout.write(
    '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json#data> <http://schema.org/name> "\\"data\\"" .\n' +
    '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json#data> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.jillix.net/vocab/DataHandler> .\n' +
    '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json#stream> <http://schema.org/name> "\\"stream\\"" .\n' +
    '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json#stream> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.jillix.net/vocab/StreamHandler> .\n' +
    '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json> <http://dbpedia.org/property/exports> <https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json#data> .\n' +
    '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json> <http://dbpedia.org/property/exports> <https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json#stream> .\n' +
    '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json> <http://schema.org/author> "\\"Adrian Ottiker <adrian@ottiker.com>\\"" .\n' +
    '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json> <http://schema.org/codeRepository> <git+https://github.com/adioo/flow-dummy.git> .\n' +
    '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json> <http://schema.org/description> "\\"Flow dummy module and data generator.\\"" .\n' +
    '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json> <http://schema.org/name> "\\"flow-dummy\\"" .\n' +
    '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json> <http://schema.org/softwareVersion> "\\"0.0.1\\"" .\n' +
    '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.org/SoftwareSourceCode> .\n'
);

for (step = 0; num_instances > step; ++step) {

    // instance
    instance = UID(8);
    instance_iri = domain + instance + iri_end;
    instances.push(instance_iri);
    process.stdout.write(createInstance(instance_iri, instance));
    process.stdout.write(createArguments(instance_iri, '_:' + UID(8)));

    // event
    num_events = random(1, 23);
    for (eStep = 0; num_events > eStep; ++eStep) {
        event = UID(8);
        event_iri = domain + instance + '/' + event + iri_end;
        events.push(event_iri);
        current_handler = '_:' + UID(8);
        process.stdout.write(createEvent(instance_iri, event_iri, event, current_handler));

        // handler
        num_handler = random(1, 23);
        for (hStep = 0; num_handler > hStep; ++hStep) {

            next_handler = hStep === (num_handler - 1) ? null : '_:' + UID(8);
            handler_type = random(0, 2);

            // select random event
            if (handler_type > 1) {
                target = events[random(0, events.length - 1)];

                // add target to dependency list
                let dependencyInstance = '<http://doma.in/_i/' + instance +'>';
                let dependencyTarget = target.substring(0, target.lastIndexOf('/')) + '>';
                let dependency = dependencyInstance + ' <http://schema.jillix.net/vocab/dependency> ' + dependencyTarget + ' .\n';
                if (dependencies.indexOf(dependency) < 0 && dependencyInstance !== dependencyTarget) {
                    dependencies.push(dependency);
                    process.stdout.write(dependency);
                }

                process.stdout.write(createEventHandler(target, current_handler, next_handler, event_iri));

            // select random instance
            } else {
                target = instances[random(0, instances.length - 1)];

                // add target to dependency list
                let dependencyInstance = '<http://doma.in/_i/' + instance +'>';
                let dependencyTarget = target.trim();
                let dependency = dependencyInstance + ' <http://schema.jillix.net/vocab/dependency> ' + dependencyTarget + ' .\n';
                if (dependencies.indexOf(dependency) < 0 && dependencyInstance !== dependencyTarget) {
                    dependencies.push(dependency);
                    process.stdout.write(dependency);
                }

                if (handler_type === 0) {
                    process.stdout.write(createDataHandler(target, current_handler, next_handler, event_iri));
                } else {
                    process.stdout.write(createStreamHandler(target, current_handler, next_handler, event_iri));
                }
            }

            // generate handler arguments
            process.stdout.write(createArguments(current_handler, '_:' + UID(8)));

            current_handler = next_handler;
        }
    }
}

function UID (len) {
    len = len || 23;
    for (var i = 0, random = ''; i < len; ++i) {
        random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
    }
    return random;
};

function random (min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// create basic instance triples
function createInstance (iri, name) {
    let s = iri + '<http://schema.org/name> "\\"' + name + '\\"" .\n' +
            iri + '<http://schema.jillix.net/vocab/roles> "\\"*\\"" .\n' +
            iri + '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.jillix.net/vocab/ModuleInstanceConfig> .\n' +
            iri + '<http://schema.jillix.net/vocab/module> <https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json> .\n';

    return s;
};

function createEvent (inst, iri, name, next_handler) {
    let s = inst + '<http://schema.jillix.net/vocab/event> ' + iri + '.\n' +
            iri + '<http://schema.jillix.net/vocab/onError> ' + onError + ' .\n' +
            iri + '<http://schema.jillix.net/vocab/onEnd> ' + onEnd + ' .\n' +
            iri + '<http://schema.org/name> "\\"' + name + '\\"" .\n' +
            iri + '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.jillix.net/vocab/FlowEvent> .\n' +
            iri + '<http://schema.jillix.net/vocab/sequence> ' + next_handler + ' .\n';

    return s;
};

function createEventHandler(event, handler, next_handler, event_ref) {
    let s = handler + ' <http://schema.jillix.net/vocab/emit> ' + event + '.\n' +
            handler + ' <http://schema.jillix.net/vocab/event> ' + event_ref + ' .\n' +
            handler + ' <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.jillix.net/vocab/EventEmit> .\n';

    if (next_handler) {
        s += handler + ' <http://schema.jillix.net/vocab/sequence> ' + next_handler + ' .\n';
    }

    return s;
};

function createDataHandler(instance, handler, next_handler, event_ref) {
    let s = handler + ' <http://schema.jillix.net/vocab/instance> ' + instance + '.\n' +
            handler + ' <http://schema.jillix.net/vocab/event> ' + event_ref + ' .\n' +
            handler + ' <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.jillix.net/vocab/DataHandler> .\n' +
            handler + ' <http://schema.jillix.net/vocab/dataHandler> ' +
            '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json#data> .\n';

    if (next_handler) {
        s += handler + ' <http://schema.jillix.net/vocab/sequence> ' + next_handler + ' .\n';
    }

    return s;
};

function createStreamHandler(instance, handler, next_handler, event_ref) {
    let s = handler + ' <http://schema.jillix.net/vocab/instance> ' + instance + '.\n' +
            handler + ' <http://schema.jillix.net/vocab/event> ' + event_ref + ' .\n' +
            handler + ' <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.jillix.net/vocab/StreamHandler> .\n' +
            handler + ' <http://schema.jillix.net/vocab/streamHandler> ' +
            '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json#stream> .\n';

    if (next_handler) {
        s += handler + ' <http://schema.jillix.net/vocab/sequence> ' + next_handler + ' .\n';
    }

    return s;
};

function createArguments (subject, args) {
    let s = subject + ' <http://schema.jillix.net/vocab/args> ' + args + ' .\n' +
            args + ' <http://schema.org/name> "\\"Name\\"" .\n';

    return s;
};
