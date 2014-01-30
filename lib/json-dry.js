/**
 * Copyright (C) 2013 by WebReflection
 * Modified by Jelle De Loecker
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

var
	// should be a not so common char
	// possibly one JSON does not encode
	// possibly one encodeURIComponent does not encode
	// right now this char is '~' but this might change in the future
	specialChar = '~',
	safeSpecialChar = '\\x' + (
		'0' + specialChar.charCodeAt(0).toString(16)
	).slice(-2),
	escapedSafeSpecialChar = '\\' + safeSpecialChar,
	specialCharRG = new RegExp(safeSpecialChar, 'g'),
	safeSpecialCharRG = new RegExp(escapedSafeSpecialChar, 'g'),

	safeStartWithSpecialCharRG = new RegExp('(?:^|[^\\\\])' + escapedSafeSpecialChar),

	indexOf = [].indexOf || function(v){
		for(var i=this.length;i--&&this[i]!==v;);
		return i;
	},
	$String = String, // there's no way to drop warnings in JSHint
	                  // about new String ... well, I need that here!
	                  // faked, and happy linter!
	iso8061 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/,
	getregex = /^\/(.*)\/(.*)/
;

function generateReplacer(value, replacer) {
	var
		path = [],
		seen = [value],
		mapp = [specialChar],
		isObject = (typeof value === 'object'),
		i
	;
	
	return function(key, value) {

		var valType;

		// the replacer has rights to decide
		// if a new object should be returned
		// or if there's some key to drop
		// let's call it here rather than "too late"
		if (replacer && typeof replacer == 'function') value = replacer.call(this, key, value);

		valType = typeof value

		// did you know ? Safari passes keys as integers for arrays
		if (key !== '' || !isObject) {
			
			if (valType === 'object' && value) {
				
				i = indexOf.call(seen, value);
				if (i < 0) {
					i = seen.push(value) - 1;

					if (value.constructor.name == 'RegExp') {
						value = {dry: 'regexp', value: value.toString()};
					}

					// key cannot contain specialChar but could be not a string
					path.push(('' + key).replace(specialCharRG, safeSpecialChar));
					mapp[i] = specialChar + path.join(specialChar);
				} else {
					value = mapp[i];
				}
			} else {
				path.pop();
				if (valType === 'string') {
					// ensure no special char involved on deserialization
					// in this case only first char is important
					// no need to replace all value (better performance)
					value = value .replace(safeSpecialChar, escapedSafeSpecialChar)
					              .replace(specialChar, safeSpecialChar);
				} else if (valType === 'number') {

					// Allow infinite values
					if (!isFinite(value)) {
						if (value > 0) {
							value = {dry: '+Infinity'};
						} else {
							value = {dry: '-Infinity'};
						}
					}
				}
			}
		}
		return value;
	};
}

function retrieveFromPath(current, keys) {
	for(var i = 0, length = keys.length; i < length; current = current[
		// keys should be normalized back here
		keys[i++].replace(safeSpecialCharRG, specialChar)
	]);
	return current;
}

function generateReviver(reviver) {
	return function(key, value) {

		var valType = typeof value;

		if (valType == 'string') {
			if (value.charAt(0) === specialChar) {
				return new $String(value.slice(1));
			} else if(value.match(iso8061)) { 
				return new Date(value);
			}
		} else if (valType == 'object' && typeof value.dry !== 'undefined') {
			if (value.dry == 'regexp' && value.value) {
				return RegExp.apply(undefined, getregex.exec(value.value).slice(1));
			} else if (value.dry == '+Infinity') {
				return Infinity;
			} else if (value.dry == '-Infinity') {
				return -Infinity;
			}
		}
		if (key === '') value = regenerate(value, value, {});
		// again, only one needed, do not use the RegExp for this replacement
		// only keys need the RegExp
		if (valType == 'string') value = value .replace(safeStartWithSpecialCharRG, specialChar)
		                                       .replace(escapedSafeSpecialChar, safeSpecialChar);
		return reviver ? reviver.call(this, key, value) : value;
	};
}

function regenerateArray(root, current, retrieve) {
	for (var i = 0, length = current.length; i < length; i++) {
		current[i] = regenerate(root, current[i], retrieve);
	}
	return current;
}

function regenerateObject(root, current, retrieve) {
	for (var key in current) {
		if (current.hasOwnProperty(key)) {
			current[key] = regenerate(root, current[key], retrieve);
		}
	}
	return current;
}

function regenerate(root, current, retrieve) {
	return current instanceof Array ?
		// fast Array reconstruction
		regenerateArray(root, current, retrieve) :
		(
			current instanceof $String ?
				(
					// root is an empty string
					current.length ?
						(
							retrieve.hasOwnProperty(current) ?
								retrieve[current] :
								retrieve[current] = retrieveFromPath(
									root, current.split(specialChar)
								)
						) :
						root
				) :
				(
					current instanceof Object ?
						// dedicated Object parser
						regenerateObject(root, current, retrieve) :
						// value as it is
						current
				)
		)
	;
}

function stringifyRecursion(value, replacer, space) {
	return JSON.stringify(value, generateReplacer(value, replacer), space);
}

function parseRecursion(text, reviver) {
	return JSON.parse(text, generateReviver(reviver));
}

this.stringify = stringifyRecursion;
this.parse = parseRecursion;

this.info = {path: false};

if (typeof __dirname !== 'undefined') {
	this.info.path = __dirname + '/json-dry.js';
}
