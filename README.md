JSON-dry
========

JSON-dry allows you to stringify objects containing circular references,
dates and regexes.

Multiple references to the same object are also correctly converted.

JSON-dry is based on circular-json


# Usage

```js
var dry = require('json-dry'),
    obj,
    ref;

ref = {
	text: 'This object is referred to',
	number: 1,
	date: new Date(),
	regex: /test/i
};

obj = {
	alpha: 'test',
	extra: ref,
	again: ref,
	three: ref
};

dry.stringify(obj);
```
