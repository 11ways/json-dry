# JSON-dry

JSON-dry allows you to stringify objects containing circular references,
dates, regexes, ...

It can also be used to serialize and revive instances of your own classes.

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

### Reviving instances

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
