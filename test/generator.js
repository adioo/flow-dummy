'use strict'

const num_instances = process.argv[2] || 42;
const instances = [];
const events = [];
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
let first_sequence;
let eStep
let num_sequence;
let sequence;
let handler_type;
let target;
let sStep;

// TODO create ids, then the triples
// TODO select onError and onEnd from cached events

for (step = 0; num_instances > step; ++step) {

    // instance
    instance = UID(8);
    instance_iri = domain + instance + iri_end;
    instances.push(instance_iri);
    process.stdout.write(createInstance(instance_iri, instance));

    // event
    num_events = random(1, 23);
    for (eStep = 0; num_events > eStep; ++eStep) {
        event = UID(8);
        event_iri = domain + instance + '/' + event + iri_end;
        events.push(event_iri);
        first_sequence = '_:' + UID(8);
        process.stdout.write(createEvent(instance_iri, event_iri, event, first_sequence));

        // sequence
        num_sequence = random(1, 23);
        for (sStep = 0; num_sequence > sStep; ++sStep) {

            // first_seq > seq > seq > seq ..
            sequence = sStep === (num_sequence - 1) ? null : '_:' + UID(8);
            handler_type = random(0, 2);

            // select random event
            if (handler_type > 1) {
                target = events[random(0, events.length - 1)];
                process.stdout.write(createEventHandler(target, first_sequence, sequence));

            // select random instance
            } else {
                target = instances[random(0, instances.length - 1)];

                if (handler_type === 0) {
                    process.stdout.write(createDataHandler(target, first_sequence, sequence));
                } else {
                    process.stdout.write(createStreamHandler(target, first_sequence, sequence));
                }
            }

            first_sequence = sequence;
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

function createEvent (inst, iri, name, sequence) {
    let s = inst + '<http://schema.jillix.net/vocab/event> ' + iri + '.\n' +
            iri + '<http://schema.jillix.net/vocab/onError> ' + onError + ' .\n' +
            iri + '<http://schema.jillix.net/vocab/onEnd> ' + onEnd + ' .\n' +
            iri + '<http://schema.org/name> "\\"' + name + '\\"" .\n' +
            iri + '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.jillix.net/vocab/FlowEvent> .\n' +
            iri + '<http://schema.jillix.net/vocab/sequence> ' + sequence + ' .\n';

    return s;
};

function createEventHandler(event, seq, nextSeq) {
    let s = seq + ' <http://schema.jillix.net/vocab/emit> ' + event + '.\n' +
            seq + ' <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.jillix.net/vocab/EventEmit> .\n';

    if (nextSeq) {
        s += seq + ' <http://schema.jillix.net/vocab/sequence> ' + nextSeq + ' .\n';
    }

    return s;
};

function createDataHandler(instance, seq, nextSeq) {
    let s = seq + ' <http://schema.jillix.net/vocab/instance> ' + instance + '.\n' +
            seq + ' <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.jillix.net/vocab/DataHandler> .\n' +
            seq + ' <http://schema.jillix.net/vocab/dataHandler> ' +
            '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json#data> .\n';

    if (nextSeq) {
        s += seq + ' <http://schema.jillix.net/vocab/sequence> ' + nextSeq + ' .\n';
    }

    return s;
};

function createStreamHandler(instance, seq, nextSeq) {
    let s = seq + ' <http://schema.jillix.net/vocab/instance> ' + instance + '.\n' +
            seq + ' <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.jillix.net/vocab/StreamHandler> .\n' +
            seq + ' <http://schema.jillix.net/vocab/streamHandler> ' +
            '<https://raw.githubusercontent.com/adioo/flow-dummy/master/module.json#stream> .\n';

    if (nextSeq) {
        s += seq + ' <http://schema.jillix.net/vocab/sequence> ' + nextSeq + ' .\n';
    }

    return s;
};
