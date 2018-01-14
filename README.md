# JSON-dry

JSON-dry allows you to stringify objects containing circular references,
dates, regexes, ...

It can also be used to serialize and revive instances of your own classes.

## Installation

    $ npm install json-dry

## Usage

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
