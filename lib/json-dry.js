"use strict";

var special_char              = '~',
    safe_special_char         = '\\x7e',
    escaped_safe_special_char = '\\' + safe_special_char,
    special_char_rg           = RegExp(safe_special_char, 'g'),
    safe_special_char_rg      = RegExp(escaped_safe_special_char, 'g'),
    get_regex                 = /^\/(.*)\/(.*)/,
    undriers                  = {},
    driers                    = {};

let global_this;

if (typeof globalThis != 'undefined') {
	global_this = globalThis;
} else if (typeof window != 'undefined') {
	global_this = window;
} else if (typeof global != 'undefined') {
	global_this = global;
} else {
	global_this = {};
}

const REFS = '~refs',
      ROOT = '~root';

/**
 * Represent a value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
class Value {

	/**
	 * Construct the value instance
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 *
	 * @param    {Object}     holder    The object that holds the value
	 * @param    {String}     key       The key this value is held under
	 * @param    {*}          value     The actual value to replace
	 * @param    {Value}      parent    The optional parent Value instance
	 */
	constructor(holder, key, value, parent) {
		this.holder = holder;
		this.key = key;
		this.value = value;
		this.parent = parent;

		if (parent) {
			parent.values.set(value, this);
		}
	}

	/**
	 * Return the dried representation of this value.
	 * Calling this more than once will make it return a reference.
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 */
	driedValue() {

		if (!this.is_processed) {
			this.is_processed = true;
			this.replaced_value = this.initialReplace(this.value);

			if (this.is_registered) {
				this.getReference();
			}

		} else {
			if (!this.ref_count) {
				this.ref_count = 0;
			}

			this.ref_count++;
			return this.getReference();
		}

		return this.replaced_value;
	}

	/**
	 * Default replace behaviour
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 */
	initialReplace() {
		return this.value;
	}

	/**
	 * Get a reference to this value
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 *
	 * @return   {Object}
	 */
	getReference() {

		if (!this.is_registered) {
			this.id = this.root.duplicates.push(this) - 1;
			this.is_registered = true;
			this.reference = {'~r': this.id};
		}

		// Replace the first one with the reference too
		if (!this.replaced_first_instance && this.parent && this.parent.replaced_value) {
			this.parent.replaced_value[this.key] = this.reference;
			this.replaced_first_instance = true;
		}

		return this.reference;
	}

	/**
	 * Return the undried version of this value
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 *
	 * @param    {Object}         holder   The holder object the undried value will be put in
	 * @param    {String|Number}  key      The property key the undried value will be put in
	 *
	 * @return   {*}
	 */
	undriedValue(holder, key) {

		if (!this.is_processed) {
			this.is_processed = true;
			this.replaced_value = this.initialRevive(this.value);
		}

		return this.replaced_value;
	}

	/**
	 * Default revive behaviour
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 */
	initialRevive() {
		return this.value;
	}

	/**
	 * Get the root `values` array
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 */
	get values() {
		return this.parent.values;
	}

	/**
	 * Get the `RootValue` instance
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 */
	get root() {
		return this.parent.root;
	}
}

/**
 * Represent the root
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
class RootValue {
	values = new Map();
	has_replacer = false;
	current_type = undefined;
	duplicates = [];

	/**
	 * Construct the root instance
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 *
	 * @param    {*}          root      The actual value that needs to be dried
	 * @param    {Function}   replacer  Optional replacer function
	 */
	 constructor(root, replacer) {
		this.value = root;
		this.root = this;

		if (replacer) {
			this.replacer = replacer;
			this.has_replacer = true;
		}

		this.values.set(root, this);
	}

	/**
	 * Replace the given value
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    0.1.0
	 * @version  2.0.0
	 *
	 * @param    {Object}     holder    The object that holds the value
	 * @param    {String}     key       The key this value is held under
	 * @param    {*}          value     The actual value to replace
	 */
	replace(holder, key, value, parent) {

		if (this.has_replacer) {
			value = this.replacer(key, value);
		}

		// All falsy values can be returned as-is
		if (!value) {
			return value;
		}

		switch (typeof value) {
			case 'number':
				if (!isFinite(value)) {
					break;
				}
			case 'boolean':
				return value;
		}

		let result = this.values.get(value);

		if (!result) {
			result = this.createValueWrapper(holder, key, value, parent);
		}

		return result.driedValue();
	}

	/**
	 * Revive the given value
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 *
	 * @param    {Object}     original_holder    The object that holds the value
	 * @param    {String}     key                The key this value is held under
	 * @param    {*}          value              The actual value to replace
	 * @param    {Value}      parent
	 * @param    {Object}     new_holder
	 */
	revive(original_holder, key, value, parent, new_holder) {

		// All falsy values can be returned as-is
		if (!value) {
			return value;
		}

		let type = typeof value;

		switch (type) {
			case 'number':
			case 'boolean':
			case 'string':
				return value;
		}

		let result = this.createReviverValueWrapper(original_holder, key, value, parent);

		return result.undriedValue(new_holder, key);
	}

	/**
	 * Create a reviver wrapper
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 *
	 * @param    {Object}     holder    The object that holds the value
	 * @param    {String}     key       The key this value is held under
	 * @param    {*}          value     The actual value to replace
	 */
	createReviverValueWrapper(holder, key, value, parent) {

		if (!value) {
			return new Value(holder, key, value, parent);
		}

		let type = typeof value;

		let result;

		if (type == 'object') {
			let dry_type = value.dry,
			    ref = value['~r'];

			if (typeof ref == 'number') {
				result = new RefValue(holder, key, value, parent);
			} else if (typeof dry_type == 'string') {
				if (dry_type == 'root') {
					result = this;
				} else if (dry_type == 'toDry') {
					result = new CustomReviverValue(holder, key, value, parent);
				} else if (undriers[dry_type]) {
					result = new UndrierValue(holder, key, value, parent);
				} else if (dry_type === '+Infinity') {
					return new NumberValue(holder, key, Infinity, parent);
				} else if (dry_type === '-Infinity') {
					return new NumberValue(holder, key, -Infinity, parent);
				} else if (dry_type === 'regexp') {
					return new RegExpValue(holder, key, value, parent);
				} else if (dry_type === 'date') {
					return new DateValue(holder, key, value, parent);
				} else {
					result = new UnknownUndrierValue(holder, key, value, parent);
				}
			}
		}

		if (!result) {
			result = this.createValueWrapper(holder, key, value, parent);
		}

		return result;
	}

	/**
	 * Create a value wrapper
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 *
	 * @param    {Object}     holder    The object that holds the value
	 * @param    {String}     key       The key this value is held under
	 * @param    {*}          value     The actual value to replace
	 */
	createValueWrapper(holder, key, value, parent) {

		let current_type = typeof value;

		switch (current_type) {
			case 'function':
				return new FunctionValue(holder, key, value, parent);
			
			case 'object':
				if (Array.isArray(value)) {
					return new ArrayValue(holder, key, value, parent);
				} else {
					return new ObjectValue(holder, key, value, parent);
				}
			
			case 'string':
				return new StringValue(holder, key, value, parent);
			
			case 'number':
				return new NumberValue(holder, key, value, parent);
			
			default:
				return new Value(holder, key, value, parent);
		}
	}

	/**
	 * Return the dried representation of this root value
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 */
	driedValue() {

		let $root;

		if (!this.is_processed) {
			this.is_processed = true;
			this.real_root = this.createValueWrapper(null, null, this.value, this);
			this.values.set(this.value, this);

			// Trigger the initial drying
			$root = this.real_root.driedValue();
		} else {
			if (!this.ref_count) {
				this.ref_count = 0;
			}

			this.ref_count++;
			return this.getReference();
		}

		let duplicate,
		    refs = [],
		    i;
		
		for (i = 0; i < this.duplicates.length; i++) {
			duplicate = this.duplicates[i];
			refs.push(duplicate.replaced_value);
		}

		let result;

		if (refs.length > 0) {
			result = {
				[REFS]: refs,
				[ROOT]: $root,
			};
		} else {
			result = $root;
		}

		this.replaced_value = result;

		return this.replaced_value;
	}

	/**
	 * Return the reference object to this root value
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 */
	getReference() {
		return {'~r': -1};
	}

	/**
	 * Return the undried value of this root
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 */
	undriedValue(holder, key) {

		if (!this.is_processed) {

			let value = this.value;

			if (!value) {
				return value;
			}

			let type = typeof value;

			switch (type) {
				case 'string':
				case 'number':
				case 'boolean':
					return value;
			};

			this.is_busy = true;
			this.is_processed = true;

			if (value[REFS] && value[ROOT]) {
				let original_refs = value[REFS],
				    length = original_refs.length,
				    $refs = [],
				    i;
				
				for (i = 0; i < length; i++) {
					$refs.push(this.createReviverValueWrapper(null, null, original_refs[i], this));
				}

				this.duplicates = $refs;
				this.value = value = value[ROOT];
			}

			this.real_root = this.createReviverValueWrapper(null, null, value, this);
			this.values.set(value, this);
			this.replaced_value = this.real_root.undriedValue(holder, key);

			if (this.when_done) {
				while (this.when_done.length) {
					this.when_done.shift()();
				}
			}

			this.is_busy = false;
		}

		return this.real_root.undriedValue(holder, key);
	}

	/**
	 * Get the when-done scheduler
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.0
	 */
	getWhenDoneScheduler() {

		if (!this.when_done_scheduler) {
			this.when_done = [];
			this.when_done_scheduler = (fnc) => this.when_done.push(fnc);
		}
		
		return this.when_done_scheduler;
	}
}

/**
 * Represent an object value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
class ObjectValue extends Value {

	initialReplace(value) {
		let replace_again = false,
		    class_name,
		    result;

		if (typeof value.constructor == 'function') {
			class_name = value.constructor.name;
		} else {
			class_name = 'Object';
		}

		if (driers[class_name] != null) {
			result = driers[class_name].fnc(this.holder, this.key, value);

			result = {
				dry   : class_name,
				value : result,
			};

			replace_again = true;
		} else if (class_name === 'RegExp' && value.constructor == RegExp) {
			result = {dry: 'regexp', value: value.toString()};
		} else if (class_name === 'Date' && value.constructor == Date) {

			// Get numeric value first
			let temp = value.valueOf();
	
			if (isNaN(temp)) {
				temp = 'invalid';
			} else {
				temp = value.toISOString();
			}
	
			result = {dry: 'date', value: temp};
		} else if (typeof value.toDry === 'function') {
			let temp = value;
			value = value.toDry();
	
			// If no path was supplied in the toDry,
			// get some more class information
			if (!value.path) {
				if (temp.constructor) {
					if (!value.namespace && temp.constructor.namespace) {
						value.namespace = temp.constructor.namespace;
					}
	
					if (!value.dry_class) {
						value.dry_class = temp.constructor.name;
					}
				}
			}
	
			value.dry = 'toDry';
			//value.drypath = path.slice(0);
			result = value;
			replace_again = true;
		} else if (typeof value.toJSON === 'function') {
			result = value.toJSON();
			replace_again = true;
		} else {
			result = this.simpleReplace(value);
		}

		if (replace_again && result) {
			result = this.root.replace(this.holder, this.key, result, this.parent);
		}

		this.replaced_value = result;

		return result;
	}

	simpleReplace(value) {

		let new_value = {},
		    keys = Object.keys(value),
		    key,
		    i;

		this.replaced_value = new_value;

		for (i = 0; i < keys.length; i++) {
			key = keys[i];
			new_value[key] = this.root.replace(value, key, value[key], this);
		}

		return new_value;
	}

	initialRevive(value) {

		let new_value = {},
		    revived,
		    keys = Object.keys(value),
		    key,
		    i;

		this.replaced_value = new_value;

		for (i = 0; i < keys.length; i++) {
			key = keys[i];
			revived = this.root.revive(value, key, value[key], this, new_value);

			if (!new_value.hasOwnProperty(key)) {
				new_value[key] = revived;
			}
		}

		return new_value;
	}
}

/**
 * Represent an array value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
class ArrayValue extends ObjectValue {

	simpleReplace(value) {
		let length = value.length,
		    new_value = new Array(length),
		    replaced,
		    i;
		
		this.replaced_value = new_value;
		
		for (i = 0; i < length; i++) {
			replaced = this.root.replace(value, i, value[i], this);

			// It's possible that a reference was added instead,
			// so check if it's undefined first
			if (new_value[i] === undefined) {
				new_value[i] = replaced;
			}
		}

		return new_value;
	}

	initialRevive(value) {

		let new_value = [],
		    length = value.length,
		    revived,
		    i;
		
		this.replaced_value = new_value;

		for (i = 0; i < length; i++) {
			revived = this.root.revive(value, i, value[i], this, new_value);
			new_value.push(revived);
		}

		return new_value;
	}
}

/**
 * Represent a function value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
class FunctionValue extends Value {

}

/**
 * Represent a string value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
class StringValue extends Value {

	driedValue() {

		if (this.value.length < 16) {
			return this.value;
		}

		return super.driedValue();
	}
}

/**
 * Represent a number value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
class NumberValue extends Value {
	driedValue() {
		let value = this.value;

		// Allow infinite values
		if (value && !isFinite(value)) {
			if (value > 0) {
				value = {dry: '+Infinity'};
			} else {
				value = {dry: '-Infinity'};
			}
		}

		return value;
	}
}

/**
 * Represent a regexp value
 * (For undrying)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
class RegExpValue extends Value {
	initialRevive(value) {
		if (value.value) {
			return RegExp.apply(undefined, get_regex.exec(value.value).slice(1));
		}
	}
}

/**
 * Represent a date value
 * (For undrying)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
class DateValue extends Value {
	initialRevive(value) {
		if (value.value) {
			return new Date(value.value);
		}
	}
}

/**
 * Represent a reference
 * (Only used during undrying)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
class RefValue extends Value {
	undriedValue(holder, key) {

		let index = this.value['~r'];

		// "-1" is a reference to the root value
		if (index === -1) {
			return this.root.undriedValue(holder, key);
		}

		let value = this.root.duplicates[index];

		if (!value) {
			return value;
		}

		let result = value.undriedValue(holder, key);
		return result;
	}
}

/**
 * Represent a value that needs reviving using registered undriers
 * (Only used during undrying)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
class UndrierValue extends Value {

	undriedValue(holder, key) {

		if (this.is_busy) {

			if (!this.placeholders) {
				this.placeholders = [];
			}

			let placeholder = Symbol();

			this.placeholders.push([holder, key, placeholder]);

			return placeholder;
		}

		return super.undriedValue(holder, key);
	}

	initialRevive(value) {

		this.is_busy = true;

		let result = this.reviveWithReviver(value);

		this.is_busy = false;

		if (this.placeholders) {
			let placeholder,
			    holder,
			    entry,
			    key;

			while (this.placeholders.length) {
				
				entry = this.placeholders.shift();

				holder = entry[0];
				key = entry[1];
				placeholder = entry[2];

				holder[key] = result;

				if (holder.$replaced) {
					let fixer = (key, value, holder) => {
						if (value === placeholder) {
							holder[key] = result;
						}
					};

					// The holder might have already been replaced with something
					// else (`$replaced` property), but we can't assume that
					// replacement expects the result to be stored under the same key
					// So we need to walk over it and check every property
					while (holder.$replaced) {
						holder = holder.$replaced;
						walk(holder, fixer);
					}
				}
			}
		}

		return result;
	}

	reviveWithReviver(value) {

		let undrier = undriers[value.dry].fnc,
		    result = this.root.revive(null, null, value.value, this);

		if (result) {
			let new_result = undrier(this.holder, this.key, result);

			if (result && typeof result == 'object') {
				result.$replaced = new_result;
			}

			result = new_result;
		}

		return result;
	}
}

/**
 * Represent a value that needs reviving using registered undriers,
 * but of which we don't have an undrier available
 * (Only used during undrying)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
class UnknownUndrierValue extends UndrierValue {
	reviveWithReviver(value) {
		return this.root.revive(null, null, value.value, this);
	}
}

/**
 * Represent a value that needs reviving
 * (Only used during undrying)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
class CustomReviverValue extends UndrierValue {

	reviveWithReviver(value) {

		value = (new ObjectValue(this.holder, this.key, value, this)).undriedValue();

		let constructor = findClass(value),
		    result = value.value;

		// Undry this element, but don't put it in the parsed object yet
		if (constructor && typeof constructor.unDry === 'function') {

			let force = false,
			    scheduler;
			
			if (constructor.unDry.length > 2) {
				scheduler = this.root.getWhenDoneScheduler();
			}

			let new_result = constructor.unDry(result, force, scheduler);
			result.$replaced = new_result;
			result = new_result;
		}

		return result;
	}
}

/**
 * Generate a replacer function
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.0.1
 *
 * @param    {Object}   root
 * @param    {Function} replacer
 *
 * @return   {Function}
 */
function createDryReplacer(root, replacer) {

	var value_paths = new WeakMap(),
	    seen_path,
	    flags = {is_root: true},
	    chain = [],
	    path = [],
	    temp,
	    last,
	    len;

	return function dryReplacer(holder, key, value) {

		// Process the value to a possible given replacer function
		if (replacer != null) {
			value = replacer.call(holder, key, value);
		}

		// All falsy values can be returned as-is
		if (!value) {
			return value;
		}

		let is_wrap;

		// An explicitly false key means this dryReplaced was
		// recursively called with a replacement object
		if (key === false) {
			key = '';
			is_wrap = true;

			// Wrappers get added to the object chain, but not the path
			// We need to be able to identify them later on
			holder.__is_wrap = true;

			// See if the wrapped value is an object
			if (holder[''] != null && typeof holder[''] === 'object') {
				holder.__is_object = true;
			}
		}

		switch (typeof value) {

			case 'function':
				// If no drier is created, return now.
				// Else: fall through
				if (!driers.Function) {
					return;
				}

			case 'object':
				value = replaceObject(dryReplacer, value, chain, flags, is_wrap, holder, path, value_paths, key);
				break;

			case 'string':
				// Make sure regular strings don't start with the path delimiter
				if (!flags.is_root && value[0] == '~') {
					value = safe_special_char + value.slice(1);
				}

				break;

			case 'number':
				// Allow infinite values
				if (value && !isFinite(value)) {
					if (value > 0) {
						value = {dry: '+Infinity'};
					} else {
						value = {dry: '-Infinity'};
					}
				}
				break;
		}

		return value;
	}
}

/**
 * Actually replace the object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.0.11
 */
function replaceObject(dryReplacer, value, chain, flags, is_wrap, holder, path, value_paths, key) {

	var class_name,
	    seen_path,
	    new_value,
	    replaced,
	    is_array,
	    keys,
	    last,
	    temp,
	    len,
	    i;

	if (typeof value.constructor == 'function') {
		class_name = value.constructor.name;
	} else {
		class_name = 'Object';
	}

	// See if the chain needs popping
	while (len = chain.length) {

		// If the current object at the end of the chain does not
		// match the current holder, move one up
		// Don't mess with the chain if this is a wrap object
		if (!is_wrap && holder !== chain[len-1]) {

			last = chain.pop();

			// Only pop the path if the popped object isn't a wrapper
			if (last && !last.__is_wrap) {
				path.pop();
			}
		} else {
			break;
		}
	}

	// Has the object been seen before?
	seen_path = value_paths.get(value);

	if (seen_path) {

		// If the path is still an array,
		// turn it into a string now
		if (typeof seen_path != 'string') {

			// First iterate over the pieces and escape them
			for (i = 0; i < seen_path.length; i++) {
				if (seen_path[i].indexOf(special_char) > -1) {
					seen_path[i] = seen_path[i].replace(special_char_rg, safe_special_char);
				}
			}

			seen_path = special_char + seen_path.join(special_char);
			value_paths.set(value, seen_path);
		}

		// Replace the value with the path
		new_value = seen_path;

		// See if the new path is shorter
		len = 1;
		for (i = 0; i < path.length; i++) {
			len += 1 + path[i].length;
		}
		len += key.length;

		if (len < seen_path.length) {
			temp = seen_path;
			seen_path = path.slice(0);

			// The key of the current value still needs to be added
			seen_path.push(key);

			// First iterate over the pieces and escape them
			for (i = 0; i < seen_path.length; i++) {
				if (seen_path[i].indexOf(special_char) > -1) {
					seen_path[i] = seen_path[i].replace(special_char_rg, safe_special_char);
				}
			}

			seen_path = special_char + seen_path.join(special_char);
			value_paths.set(value, seen_path);

			// This entry still has to refer to the longer path,
			// otherwise it'll refer to itself
			seen_path = temp;
		}

		value = new_value;

		return value;
	}

	if (!flags.is_root && !is_wrap) {
		path.push(key);
	} else {
		flags.is_root = false;
	}

	// Make a copy of the current path array
	value_paths.set(value, path.slice(0));

	if (driers[class_name] != null) {
		value = driers[class_name].fnc(holder, key, value);

		value = {
			dry: class_name,
			value: value
		};

		if (driers[class_name].options.add_path !== false) {
			value.drypath = path.slice(0);
		}

		replaced = {'': value};
	} else if (class_name === 'RegExp' && value.constructor == RegExp) {
		value = {dry: 'regexp', value: value.toString()};
		replaced = {'': value};
	} else if (class_name === 'Date' && value.constructor == Date) {

		// Get numeric value first
		temp = value.valueOf();

		if (isNaN(temp)) {
			temp = 'invalid';
		} else {
			temp = value.toISOString();
		}

		value = {dry: 'date', value: temp};
		replaced = {'': value};
	} else if (typeof value.toDry === 'function') {
		temp = value;
		value = value.toDry();

		// If no path was supplied in the toDry,
		// get some more class information
		if (!value.path) {
			if (temp.constructor) {
				if (!value.namespace && temp.constructor.namespace) {
					value.namespace = temp.constructor.namespace;
				}

				if (!value.dry_class) {
					value.dry_class = temp.constructor.name;
				}
			}
		}

		value.dry = 'toDry';
		value.drypath = path.slice(0);
		replaced = {'': value};
	} else if (typeof value.toJSON === 'function') {
		value = value.toJSON();
		replaced = {'': value};
	} else {
		is_array = Array.isArray(value);
	}

	if (replaced) {
		// Push the replaced object on the chain
		chain.push(replaced);

		// Jsonify the replaced object
		value = dryReplacer(replaced, false, replaced['']);

		// At least one part of the path & chain will have
		// to be popped off. This is needed for toJSON calls
		// that return primitive values
		temp = chain.pop();

		// Don't pop off anything from the path if the last item
		// from the chain was a wrapper for an object,
		// because then it'll already be popped of
		if (!(temp && temp.__is_wrap && temp.__is_object)) {
			path.pop();
		}

		// Break out of the switch
		return value;
	}

	// Push this object on the chain
	chain.push(value);

	if (is_array) {
		new_value = [];

		for (i = 0; i < value.length; i++) {
			new_value[i] = dryReplacer(value, String(i), value[i]);
		}
	} else {
		new_value = recurseGeneralObject(dryReplacer, value);
	}

	value = new_value;

	return value;
}

/**
 * Recursively replace the given regular object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.11
 * @version  1.0.11
 *
 * @param    {Function}   dryReplacer
 * @param    {Object}     value
 *
 * @return   {Object}
 */
function recurseGeneralObject(dryReplacer, value) {

	var new_value = {},
	    keys = Object.keys(value),
	    key,
	    i;

	for (i = 0; i < keys.length; i++) {
		key = keys[i];
		new_value[key] = dryReplacer(value, key, value[key]);
	}

	return new_value;
}

/**
 * Generate reviver function
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.0.2
 *
 * @param    {Function}   reviver
 * @param    {Map}        undry_paths
 *
 * @return   {Function}
 */
function generateReviver(reviver, undry_paths) {

	return function dryReviver(key, value) {

		var val_type = typeof value,
		    constructor,
		    temp;

		if (val_type === 'string') {
			if (value[0] === special_char) {
				// This is actually a path that needs to be replaced.
				// Put in a String object for now
				return new String(value.slice(1));
			} else if (value[0] == '\\' && value[1] == 'x' && value[2] == '7' && value[3] == 'e') {
				value = special_char + value.slice(4);
			}
		} else if (value && value.dry != null) {

			switch (value.dry) {

				case 'date':
					if (value.value) {
						return new Date(value.value);
					}
					break;

				case 'regexp':
					if (value.value) {
						return RegExp.apply(undefined, get_regex.exec(value.value).slice(1));
					}
					break;

				case '+Infinity':
					return Infinity;

				case '-Infinity':
					return -Infinity;

				case 'toDry':
					constructor = findClass(value);

					// Undry this element, but don't put it in the parsed object yet
					if (constructor && typeof constructor.unDry === 'function') {
						value.unDryConstructor = constructor;
					} else {
						value.undried = value.value;
					}

					if (value.drypath) {
						undry_paths.set(value.drypath.join(special_char), value);
					} else {
						return value.undried;
					}
					break;

				default:
					if (typeof value.value !== 'undefined') {
						if (undriers[value.dry]) {
							value.unDryFunction = undriers[value.dry].fnc;

							if (!value.drypath) {
								// No path given? Then do the undrying right now
								value.undried = value.unDryFunction(this, key, value.value)
							}

						} else {
							value.undried = value.value;
						}

						if (value.drypath) {
							undry_paths.set(value.drypath.join(special_char), value);
						} else {
							return value.undried;
						}
					}
			}
		}

		if (reviver == null) {
			return value;
		}

		return reviver.call(this, key, value);
	};
};

/**
 * Deep clone an object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 *
 * @param    {Object}   obj
 * @param    {String}   custom_method   Custom method to use if available
 * @param    {Array}    extra_args      Extra arguments for the custom method
 * @param    {WeakMap}  wm
 *
 * @return   {Object}
 */
function clone(obj, custom_method, extra_args, wm) {

	if (custom_method instanceof WeakMap) {
		wm = custom_method;
		custom_method = null;
	} else if (extra_args instanceof WeakMap) {
		wm = extra_args;
		extra_args = null;
	}

	if (!wm) {
		wm = new WeakMap();
		wm.source = obj;
		wm.custom_method = custom_method;
		wm.extra_args = extra_args;
	} else if (wm.has(obj)) {
		return wm.get(obj);
	}

	if (!wm.when_done_queue) {
		wm.when_done_queue = [];
		wm.drymap = new Map();

		wm.whenDone = function whenDone(fnc) {
			if (!fnc) return;
			wm.when_done_queue.push(fnc);
		};
	}

	if (custom_method) {
		extra_args = [wm].concat(extra_args);
	}

	let result = real_clone({'_': obj}, custom_method, extra_args, wm)['_'],
	    i;

	if (wm.when_done_queue.length) {
		let temp_val,
		    key;

		// Iterate over all the objects created with the `toDry` method
		wm.drymap.forEach(function each(val, temp) {
			for (key in temp) {
				temp_val = temp[key];

				if (wm.drymap.has(temp_val)) {
					temp[key] = wm.drymap.get(temp_val);
				}
			}
		});

		for (i = 0; i < wm.when_done_queue.length; i++) {
			wm.when_done_queue[i]();
		}
	}

	return result;
}

/**
 * Deep clone an object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 *
 * @param    {Object}   obj
 * @param    {String}   custom_method   Custom method to use if available
 * @param    {Array}    extra_args      Extra arguments for the custom method
 * @param    {WeakMap}  wm
 *
 * @return   {Object}
 */
function real_clone(obj, custom_method, extra_args, wm) {

	var entry_type,
	    name_type,
	    target,
	    entry,
	    split,
	    keys,
	    temp,
	    key,
	    len,
	    i;

	if (Array.isArray(obj)) {
		target = [];
	} else {
		target = {};
	}

	keys = Object.keys(obj);
	len = keys.length;

	// Remember the root object and its clone
	wm.set(obj, target);

	for (i = 0; i < len; i++) {
		key = keys[i];
		entry = obj[key];
		entry_type = typeof entry;

		if (entry && (entry_type == 'object' || entry_type == 'function')) {

			if (entry_type == 'function' && !driers.Function) {
				continue;
			}

			// If this has been cloned before, use that
			if (wm.has(entry)) {
				target[key] = wm.get(entry);
				continue;
			}

			if (entry.constructor) {
				name_type = entry.constructor.name;

				if (custom_method && entry[custom_method]) {
					target[key] = entry[custom_method].apply(entry, extra_args);
				} else if (driers[name_type] != null) {
					// Look for a registered drier function
					temp = driers[name_type].fnc(obj, key, entry);

					if (undriers[name_type]) {
						target[key] = undriers[name_type].fnc(target, key, temp);
					} else {
						target[key] = temp;
					}
				} else if (entry.dryClone) {
					// Look for dryClone after
					target[key] = entry.dryClone(wm, custom_method);
				} else if (entry.toDry) {
					// Perform the toDry function
					let uncloned_dried = entry.toDry();

					// Remember this temporary object to prevent infinite loops
					wm.set(entry, uncloned_dried);

					// Clone the value,
					// because returned objects aren't necesarilly cloned yet
					let cloned_dried = real_clone(uncloned_dried, custom_method, extra_args, wm).value;

					// Perform the undry function
					if (entry.constructor.unDry) {
						target[key] = entry.constructor.unDry(cloned_dried, custom_method || true, wm.whenDone);
					} else {
						// If there is no undry function, the clone will be a simple object
						target[key] = cloned_dried;
					}

					// Remember both entries (for circular undry references)
					wm.drymap.set(cloned_dried, target[key]);
					wm.drymap.set(uncloned_dried, target[key]);

				} else if (name_type == 'Date') {
					target[key] = new Date(entry);
				} else if (name_type == 'RegExp') {
					temp = entry.toString();
					split = temp.match(/^\/(.*?)\/([gim]*)$/);

					if (split) {
						target[key] = RegExp(split[1], split[2]);
					} else {
						target[key] = RegExp(temp);
					}
				} else if (typeof entry.clone == 'function') {
					// If it supplies a clone method, use that
					target[key] = entry.clone();
				} else if (entry.toJSON) {
					temp = entry.toJSON();

					if (temp && typeof temp == 'object') {
						temp = real_clone(temp, custom_method, extra_args, wm);
					}

					target[key] = temp;
				} else {
					target[key] = real_clone(entry, custom_method, extra_args, wm);
				}
			} else {
				target[key] = real_clone(entry, custom_method, extra_args, wm);
			}

			// Remember this clone for later
			wm.set(entry, target[key]);
		} else {
			target[key] = entry;
		}
	}

	return target;
}

/**
 * Register a drier
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Function|String}   constructor   What constructor to listen to
 * @param    {Function} fnc
 * @param    {Object}   options
 */
function registerDrier(constructor, fnc, options) {

	var path;

	if (typeof constructor == 'function') {
		path = constructor.name;
	} else {
		path = constructor;
	}

	driers[path] = {
		fnc     : fnc,
		options : options || {}
	};
}

/**
 * Register an undrier
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Function|String}   constructor   What constructor to listen to
 * @param    {Function} fnc
 * @param    {Object}   options
 */
function registerUndrier(constructor, fnc, options) {

	var path;

	if (typeof constructor == 'function') {
		path = constructor.name;
	} else {
		path = constructor;
	}

	undriers[path] = {
		fnc     : fnc,
		options : options || {}
	};
}

/**
 * Register a class that can be serialized/revived
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.5
 *
 * @param    {String}            name          The optional name of the class
 * @param    {Function|String}   constructor   What constructor to listen to
 */
function registerClass(name, constructor) {

	var context = exports.Classes;

	if (typeof name == 'function') {
		constructor = name;
		name = constructor.name;
	}

	if (constructor.namespace) {
		context = fromPath(exports.Classes, constructor.namespace);

		if (!context) {
			context = {};
			setPath(exports.Classes, constructor.namespace.split('.'), context);
		}
	}

	context[name] = constructor;
}

/**
 * Find a class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.9
 *
 * @param    {String}   value   The name of the class
 */
function findClass(value) {

	var constructor,
	    ns;

	// Return nothing for falsy values
	if (!value) {
		return null;
	}

	// Look for a regular class when it's just a string
	if (typeof value == 'string') {

		if (exports.Classes[value]) {
			return exports.Classes[value];
		}

		return null;
	}

	if (value.path) {
		return fromPath(exports.Classes, value.path);
	} else {
		if (value.namespace) {
			ns = fromPath(exports.Classes, value.namespace);
		} else {
			ns = exports.Classes;
		}

		if (value.dry_class) {
			constructor = fromPath(ns, value.dry_class);
		} else if (value.name) {
			constructor = ns[value.name];
		}

		if (!constructor && ns) {
			if (ns.main_class) {
				ns = ns.main_class;
			}

			if (ns && typeof ns.getClassForUndry == 'function') {
				constructor = ns.getClassForUndry(value.dry_class || value.name);
			}
		}
	}

	if (!constructor) {
		console.log('Could not find constructor for', value);
	}

	return constructor;
}

/**
 * Regenerate an array
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.4
 * @version  1.0.8
 *
 * @return   {Array}
 */
function regenerateArray(root, holder, current, seen, retrieve, undry_paths, old, current_path) {

	var length = current.length,
	    temp,
	    i;

	for (i = 0; i < length; i++) {
		// Only regenerate if it's not yet seen
		if (!seen.get(current[i])) {

			temp = current_path.slice(0);
			temp.push(i);

			current[i] = regenerate(root, current, current[i], seen, retrieve, undry_paths, old, temp);
		}
	}

	return current;
};

/**
 * Regenerate an object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.4
 * @version  1.1.1
 *
 * @return   {Object}
 */
function regenerateObject(root, holder, current, seen, retrieve, undry_paths, old, current_path) {

	// Do not regenerate the global object
	if (current === global_this) {
		return current;
	}

	let path,
	    temp,
	    key;

	for (key in current) {
		if (current.hasOwnProperty(key)) {
			// Only regenerate if it's not already seen
			if (!seen.get(current[key])) {
				path = current_path.slice(0);
				path.push(key);

				temp = regenerate(root, current, current[key], seen, retrieve, undry_paths, old, path);

				// @TODO: Values returned by `unDry` methods also get regenerated,
				// even though these could contain properties coming from somewhere else,
				// like live HTMLCollections. Assigning anything to that will throw an error.
				// This is a workaround to that proble: if the value is exactly the same,
				// it's not needed to assign it again, so it won't throw an error,
				// but it's not an ideal solution.
				if (temp !== current[key]) {

					if (current[key] && current[key] instanceof String) {
						// String object instances are path/references,
						// so we can just overwrite it with the regenerated result
						current[key] = temp;
					} else {
						throw new Error('Failed to regenerate "' + key + '"');
					}
				}
			}
		}
	}

	return current;
};

/**
 * Regenerate a value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.1
 * @version  1.1.1
 *
 * @param    {Object}   root          The root object being regenerated
 * @param    {Object}   holder        The parent object of the current value
 * @param    {Mixed}    current       The current value to regenerate
 * @param    {WeakMap}  seen          All the (original) values that have already been seen
 * @param    {Object}   retrieve      Value of references that have already been regenerated
 * @param    {Map}      undry_paths   Regenerated values that still need to be revived with some function
 * @param    {Object}   old           Old, unregenerated wrapper entries are stored here in case
 *                                    references still exist to its children
 * @param    {Array}    current_path  The path of the current value being regenerated
 *
 * @return   {Mixed}
 */
function regenerate(root, holder, current, seen, retrieve, undry_paths, old, current_path) {
	try {
		return _regenerate(root, holder, current, seen, retrieve, undry_paths, old, current_path);
	} catch (err) {

		// This makes sure the initially wrapped error & path is thrown
		if (err.is_dry_error) {
			throw err;
		}

		let message = 'Failed to regenerate "' + current_path.join('.') + '": ';

		let new_error = new Error(message + err.message);
		new_error.code = err.code;
		new_error.stack = message + err.stack;
		new_error.is_dry_error = true;
		new_error.root = root;
		new_error.holder = holder;

		throw new_error;
	}
}

/**
 * Regenerate a value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.4
 * @version  1.0.8
 *
 * @return   {Mixed}
 */
function _regenerate(root, holder, current, seen, retrieve, undry_paths, old, current_path) {

	var temp;

	if (current && typeof current == 'object') {
		// Remember this object has been regenerated already
		seen.set(current, true);

		if (current instanceof Array) {
			return regenerateArray(root, holder, current, seen, retrieve, undry_paths, old, current_path);
		}

		if (current instanceof String) {

			if (current.length > -1) {
				current = current.toString();

				if (temp = undry_paths.get(current)) {
					if (typeof temp.undried != 'undefined') {
						return temp.undried;
					}

					if (!holder) {
						throw new Error('Unable to resolve recursive reference');
					}

					undry_paths.extra_pass.push([holder, temp, current_path]);

					return temp;
				}

				if (retrieve.hasOwnProperty(current)) {
					temp = retrieve[current];
				} else {
					temp = retrieve[current] = retrieveFromPath(root, current.split(special_char));

					if (typeof temp == 'undefined') {
						temp = retrieve[current] = getFromOld(old, current.split(special_char));
					}
				}

				// Because we always regenerate parsed objects first
				// (JSON-dry parsing goes from string » object » regenerated object)
				// keys of regular objects can appear out-of-order, so we need to parse them
				if (temp && temp instanceof String) {
					// Unset the String as a valid result
					retrieve[current] = null;

					// Regenerate the string again
					// (We have to create a new instance, because it's already been "seen")
					temp = retrieve[current] = regenerate(root, holder, new String(temp), seen, retrieve, undry_paths, old, current_path);
				}

				return temp;
			} else {
				return root;
			}
		}

		return regenerateObject(root, holder, current, seen, retrieve, undry_paths, old, current_path);
	}

	return current;
};

/**
 * Find path in an "old" object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.10
 * @version  1.0.10
 *
 * @param    {Object}   old      The object to look in
 * @param    {Array}    pieces   The path to look for
 *
 * @return   {Mixed}
 */
function getFromOld(old, pieces) {

	var length = pieces.length,
	    result,
	    path,
	    rest,
	    i;

	for (i = 0; i < length; i++) {
		path = pieces.slice(0, length - i).join('.');

		result = old[path];

		if (typeof result != 'undefined') {

			if (i == 0) {
				return result;
			}

			rest = pieces.slice(pieces.length - i);

			result = retrieveFromPath(result, rest);

			if (typeof result != 'undefined') {
				return result;
			}
		}
	}
}

/**
 * Retrieve from path.
 * Set the given value, but only if the containing object exists.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.4
 * @version  1.0.10
 *
 * @param    {Object}   current   The object to look in
 * @param    {Array}    keys      The path to look for
 * @param    {Mixed}    value     Optional value to set
 *
 * @return   {Mixed}
 */
function retrieveFromPath(current, keys) {

	var length = keys.length,
	    prev,
	    key,
	    i;

	// Keys [''] always means the root
	if (length == 1 && keys[0] === '') {
		return current;
	}

	for (i = 0; i < length; i++) {
		key = keys[i];

		// Normalize the key
		if (typeof key == 'number') {
			// Allow
		} else if (key.indexOf(safe_special_char) > -1) {
			key = key.replace(safe_special_char_rg, special_char);
		}

		prev = current;

		if (current) {
			if (current.hasOwnProperty(key)) {
				current = current[key];
			} else {
				return undefined;
			}
		} else {
			return undefined;
		}
	}

	return current;
}

/**
 * Extract something from an object by the path
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.0.0
 *
 * @param    {Object}    obj
 * @param    {String}    path
 *
 * @return   {Mixed}
 */
function fromPath(obj, path) {

	var pieces,
	    here,
	    len,
	    i;

	if (typeof path == 'string') {
		pieces = path.split('.');
	} else {
		pieces = path;
	}

	here = obj;

	// Go over every piece in the path
	for (i = 0; i < pieces.length; i++) {
		if (here != null) {
			if (here.hasOwnProperty(pieces[i])) {
				here = here[pieces[i]];
			} else {
				return null;
			}
		} else {
			break;
		}
	}

	return here;
}

/**
 * Set something on the given path
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.2
 *
 * @param    {Object}    obj
 * @param    {Array}     path
 * @param    {Boolean}   force   If a piece of the path doesn't exist, create it
 *
 * @return   {Mixed}
 */
function setPath(obj, keys, value, force) {

	var here,
	    i;

	here = obj;

	for (i = 0; i < keys.length - 1; i++) {

		if (here != null) {
			if (here.hasOwnProperty(keys[i])) {
				here = here[keys[i]];
			} else {
				if (force && here[keys[i]] == null) {
					here[keys[i]] = {};
					here = here[keys[i]];
					continue;
				}

				return null;
			}
		}
	}

	here[keys[keys.length - 1]] = value;
}

/**
 * Convert an object to a DRY object, ready for stringifying
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   value
 * @param    {Function} replacer
 *
 * @return   {Object}
 */
function toDryObject(value, replacer) {
	var root = {'': value};
	return createDryReplacer(root, replacer)(root, '', value);
}

/**
 * Convert directly to a string
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   value
 * @param    {Function} replacer
 *
 * @return   {Object}
 */
function stringify(value, replacer, space) {
	return JSON.stringify(toDryObject(value, replacer), null, space);
}

/**
 * Map an object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.2
 * @version  1.0.0
 *
 * @param    {Object}     obj     The object to walk over
 * @param    {Function}   fnc     The function to perform on every entry
 * @param    {Object}     result  The object to add to
 *
 * @return   {Object}
 */
function walk(obj, fnc, result, seen) {

	var is_root,
	    keys,
	    key,
	    ret,
	    i;

	if (!seen) {
		seen = new WeakMap();
	}

	seen.set(obj, true);

	if (!result) {
		is_root = true;

		if (Array.isArray(obj)) {
			result = [];
		} else {
			result = {};
		}
	}

	keys = Object.keys(obj);

	for (i = 0; i < keys.length; i++) {
		key = keys[i];

		if (typeof obj[key] == 'object' && obj[key] != null) {

			if (!seen.get(obj[key])) {
				if (Array.isArray(obj[key])) {
					result[key] = walk(obj[key], fnc, [], seen);
				} else {
					result[key] = walk(obj[key], fnc, {}, seen);
				}
			}

			result[key] = fnc(key, result[key], result);
		} else {
			// Fire the function
			result[key] = fnc(key, obj[key], obj);
		}
	}

	if (is_root) {
		result = fnc('', result);
	}

	return result;
}

/**
 * Convert from a dried object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 *
 * @param    {Object}   value
 *
 * @return   {Object}
 */
function parse(object, reviver) {

	var undry_paths = new Map(),
	    when_done   = [],
	    retrieve    = {},
	    reviver,
	    result,
	    holder,
	    entry,
	    temp,
	    seen,
	    path,
	    key,
	    old = {},
	    i;

	// Create the reviver function
	reviver = generateReviver(reviver, undry_paths);

	if (typeof object == 'string') {
		object = JSON.parse(object);
	}

	if (!object || typeof object != 'object') {
		return object;
	}

	result = walk(object, reviver);

	if (result == null) {
		return result;
	}

	function whenDone(fnc) {
		if (!fnc) return;
		when_done.push(fnc);
	}

	// To remember which objects have already been revived
	seen = new WeakMap();

	// Maybe paths need another round of undrying
	undry_paths.extra_pass = [];

	// Iterate over all the values that require some kind of function to be revived
	undry_paths.forEach(function eachEntry(entry, path) {

		var path_array = entry.drypath,
		    path_string = path_array.join('.');

		// Regenerate this replacement wrapper first
		regenerate(result, null, entry, seen, retrieve, undry_paths, old, path_array.slice(0));

		if (entry.unDryConstructor) {
			entry.undried = entry.unDryConstructor.unDry(entry.value, false, whenDone);
		} else if (entry.unDryFunction) {
			entry.undried = entry.unDryFunction(entry, null, entry.value, whenDone);
		} else {
			entry.undried = entry.value;
		}

		// Remember the old wrapper entry, some other references
		// may still point to it's children
		old[path_string] = entry;

		if (entry.drypath && entry.drypath.length) {
			setPath(result, entry.drypath, entry.undried);
		}
	});

	for (i = 0; i < undry_paths.extra_pass.length; i++) {
		entry = undry_paths.extra_pass[i];
		holder = entry[0];
		temp = entry[1];
		path = entry[2];

		for (key in holder) {
			if (holder[key] == temp) {
				holder[key] = temp.undried;
				break;
			}
		}

		path.pop();

		// Annoying workaround for some circular references
		if (path.length && path[path.length - 1] == 'value') {
			path.pop();
		}

		if (path.length) {

			// Get the other holder
			holder = retrieveFromPath(result, path);

			// If the holder object was not found in the result,
			// it was probably a child of ANOTHER holder that has already been undried & replaces
			// Just get the value from the object containing old references
			if (!holder) {
				holder = getFromOld(old, path);
			}

			for (key in holder) {
				if (holder[key] == temp) {
					holder[key] = temp.undried;
					break;
				}
			}
		}
	}

	// Only now we can resolve paths
	result = regenerate(result, result, result, seen, retrieve, undry_paths, old, []);

	if (result.undried != null && result.dry) {
		result = result.undried;
	}

	for (i = 0; i < when_done.length; i++) {
		when_done[i]();
	}

	return result;
}

exports.stringify       = stringify;
exports.toObject        = toDryObject;
exports.parse           = parse;
exports.clone           = clone;
exports.Classes         = {};
exports.registerClass   = registerClass;
exports.registerUndrier = registerUndrier;
exports.registerDrier   = registerDrier;
exports.findClass       = findClass;
exports.walk            = walk;

exports.trynew = function(value, replacer) {

	let root = new RootValue(value, replacer);
	return root.driedValue();
}
exports.newparse = function(value) {

	if (typeof value === 'string') {
		value = JSON.parse(value);
	}

	let root = new RootValue(value, null);
	let result = root.undriedValue();

	return result;
}

exports.toObject = exports.trynew;
exports.parse = exports.newparse;
exports.stringify = function stringify(value, replacer, space) {
	let obj = exports.toObject(value, replacer);
	return JSON.stringify(obj, null, space);
}