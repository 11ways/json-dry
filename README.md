# JSON-dry

[![NPM version](http://img.shields.io/npm/v/json-dry.svg)](https://npmjs.org/package/json-dry) [![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fskerit%2Fjson-dry.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fskerit%2Fjson-dry?ref=badge_shield)

[![Build Status](https://travis-ci.org/skerit/json-dry.svg?branch=master)](https://travis-ci.org/skerit/json-dry)
[![Coverage Status](https://coveralls.io/repos/github/skerit/json-dry/badge.svg?branch=master)](https://coveralls.io/github/skerit/json-dry?branch=master)

JSON-dry allows you to stringify objects containing circular references,
dates, regexes, ...

It can also be used to serialize and revive instances of your own classes.


## Table of contents

  * [Installation](#installation)
  * [Usage](#usage)
    * [Basic example](#basic-example)
    * [Implementing methods for serializing & reviving instances](#implementing-methods-for-serializing--reviving-instances)
    * [toObject](#toobject)
  * [Cloning objects & instances](#cloning-objects--instances)
    * [Clone methods](#clone-methods)
      * [dryClone](#dryclone)
      * [Custom clone methods](#custom-clone-methods)
  * [Project history](#project-history)
  * [Project future](#project-future)
  * [Versioning](#versioning)
  * [License](#license)
  * [Acknowledgments](#acknowledgments)



[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fskerit%2Fjson-dry.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fskerit%2Fjson-dry?ref=badge_large)

## Installation

    $ npm install json-dry


## Usage

### Basic example

This is a basic example of stringifying an object (containing multiple references to the same object) and parsing it again.

```js
var Dry = require('json-dry');

// The object we'll serialize later
var obj = {};

// The object we'll make multiple references to
var ref = {
    date  : new Date(),
    regex : /test/i
};

// Now we'll make multiple references:
// `reference_one` and `reference_two` both point to the same object
// `date` refers to a `Date` object
obj.reference_one = ref;
obj.reference_two = ref;
obj.date = ref.date;

// Stringify the object
var dried = Dry.stringify(obj);
// {
//     "reference_one": {
//         "date": {
//             "dry": "date",
//             "value": "2018-01-14T17:45:57.989Z"
//         },
//         "regex": {
//             "dry": "regexp",
//             "value": "/test/i"
//         }
//     },
//     "reference_two": "~reference_one",
//     "date": "~reference_one~date"
// }

// Now we'll revive it again
var undried = Dry.parse(dried);
// { reference_one: { date: 2018-01-14T17:56:43.149Z, regex: /test/i },
//   reference_two: { date: 2018-01-14T17:56:43.149Z, regex: /test/i },
//   date: 2018-01-14T17:58:50.427Z }

// See if they're the same objects (as it should)
undried.reference_one == undried.reference_two;
// true

// The date outside of the reference object is also the same reference
undried.reference_one.date == undried.date;
// true
```


### Implementing methods for serializing & reviving instances

Let's create an example class you might want to serialize and revive:

```js
// The class constructor
function Person(options) {
    this.firstname = options.firstname;
    this.lastname = options.lastname;
}

// A simple method that prints out the full name
Person.prototype.fullname = function fullname() {
    return this.firstname + ' ' + this.lastname;
};

// Create an object
var jelle = new Person({firstname: 'Jelle', lastname: 'De Loecker'});

// Test out the fullname method
jelle.fullname();
// returns "Jelle De Loecker"
```

So now we've created a very basic class, let's register the class and add the **2** required methods for serializing & reviving.

```js
// We need to register the class
Dry.registerClass(Person);

// Add the `toDry` method that will be called upon when serializing/stringifying
Person.prototype.toDry = function toDry() {
    return {
        value: {
            firstname : this.firstname,
            lastname  : this.lastname
        }
    };
};

// Now add the `unDry` method as a **static** method, on the constructor
Person.unDry = function unDry(value) {
    // How you do this is up to you.
    // You can call the constructor for this simple class,
    // or you can use Object.create, ...
    var result = new Person(value);
    return result;
};
```

Now let's try stringifying it:

```js
var dried = Dry.stringify(jelle);
// {"value":{"firstname":"Jelle","lastname":"De Loecker"},"dry_class":"Person","dry":"toDry","drypath":[]}

// And parse it again
var undried = Dry.parse(dried);
// Person { firstname: 'Jelle', lastname: 'De Loecker' }

// And it works
undried.fullname();
// returns "Jelle De Loecker"
```


### toObject

While `Dry.stringify` will return you with a json-valid string, `Dry.toObject` will give you a valid simplified object.

In fact: `Dry.stringify` is just a function that performs `JON.stringify` on `Dry.toObject`'s output.

**Why would you want to use this?** Things like `Workers` and `IndexedDB` communicate data using the [structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm). So instead of performing expensive stringify operations you can just use these objects.


## Cloning objects & instances

JSON-Dry offers a specialized `clone` method. While in theory you could clone an object by drying end reviving it, like so:

```js
var cloned = Dry.parse(Dry.toObject(jelle))
```

This is 14x slower than using `clone`, because `toObject` needs to generate paths, escape certain string values and create wrapper objects. These expensive things can be ignored when cloning:

```js
var cloned = Dry.clone(jelle);
```


### Clone methods

If you've added a `toDry` and `unDry` method to your class, by default the `clone` method will use those to create the clone.

However, you can also create another method that gets precedence:


#### dryClone

```js
Person.prototype.dryClone = function dryClone(seen_map, custom_method) {
    return new Person({
        firstname : this.firstname,
        lastname  : this.lastname
    });
}    
```


#### Custom clone methods

The `clone` method takes an extra parameter called `custom_method`. If you're cloning something that has a function property with the same name, that'll be used.

This can be used when you want to redact certain parts, for example:

```js
Person.prototype.specialOccasionClone = function specialOccasionClone(seen_map, custom_method) {
    return new Person({
        firstname : this.firstname[0] + '.', // Only add the first letter of the name
        lastname  : this.lastname
    });
};

var special_clone = Dry.clone(jelle, 'specialOccasionClone');
special_clone.fullname();
// Returns "J. De Loecker"
```

## Project history

Earlier versions of the project were heavily based on [circular-json](https://github.com/WebReflection/circular-json), a small library that adds (circular) reference support to JSON.

A lot of the JavaScript code on my websites was already shared between the server & client side, but I also wanted an easy way of sending data to the client while retaining references & class instances, so I started adding features to circular-json and called it `json-dry` (*dry* as in *don't repeat yourself*).

After version 0.1.6 I integrated `json-dry` into my [protoblast](https://github.com/skerit/protoblast) library, and development continued in there. But now it has deserved its own repository once again.

This version is a rewrite of earlier versions. `circular-json` used (and still uses) multiple arrays to keep track of already used objects, but `json-dry` now uses `WeakMap`s, something that makes the code easier to maintain and is also faster.

`circular-json` was also implemented as a `replacer` and `reviver` function to `JSON.stringify` and `JSON.parse` respectively. `json-dry` actually creates a new object before `stringifying` it.

Because multiple references are represented as `~paths~to~the~first~reference`, the size of the JSON string can be a lot smaller. Can be, though, because sometimes reference paths are longer than the object they are refering to.

Because of this, as soon as `json-dry` encounters a new path that is smaller than the previous one, it'll use that in the future. This helps a bit, though more improvements could be made in the future.


## Project future

* Possibly use objects or arrays instead of string primitives for references. This would speed up serializing and parsing, but be a bit more verbose. Tell me what you think in [issue #2](https://github.com/skerit/json-dry/issues/2)


## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/skerit/json-dry/releases).


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details


## Acknowledgments

Many thanks to [WebReflection](https://github.com/WebReflection/), whose [circular-json](https://github.com/WebReflection/circular-json) was the basis for earlier versions of this project.