'use strict'

const fs = require('fs');
const path = '/home/adioo/Repos/service/composition/';
const instances = [];
const files = fs.readdirSync(path);
const domain = 'https://static.jillix.com/';

files.forEach(file => instances.push(JSON.parse(fs.readFileSync(path + file))));
instances.forEach(Convert);

function write (subject, predicate, object) {
    process.stdout.write(subject + ' <' + predicate + '> ' + object + ' .\n');
}

function Convert (instance) {

    // name
    if (instance.name) {
        write('<' + domain + instance.name + '>', 'http://schema.org/name', '"\\"' + instance.name + '\\""');
    }

    // module
    if (instance.module) {
        write(
            '<' + domain + instance.name + '>',
            'http://schema.jillix.net/vocab.module',
            '<https://raw.githubusercontent.com/jillix/' + instance.module + '/master/module.json>'
        );
    }

    // roles
    if (instance.roles) {
        for (let role in instance.roles) {
            write(
                '<' + domain + instance.name + '>',
                'http://schema.jillix.net/vocab/roles',
                '"\\"' + role + '\\"'
            );
        }
    }

    // args
    if (instance.config) {
        write(
            '<' + domain + instance.name + '>',
            'http://schema.jillix.net/vocab/args',
            '"\\"' + JSON.stringify(instance.config).replace(/"/g, '\\"') + '\\""'
        );
    }

    if (instance.flow) {
        //flow
    }

    //process.exit(1);
}
