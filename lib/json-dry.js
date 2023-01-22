"use strict";

const GET_REGEX  = /^\/(.*)\/(.*)/,
      UNDRIERS   = new Map(),
      DRIERS     = new Map(),
      REFS       = '~refs',
      ROOT       = '~root';

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
	 * @version  2.0.1
	 *
	 * @param    {Object}     holder    The object that holds the value
	 * @param    {String}     key       The key this value is held under
	 * @param    {*}          value     The actual value to replace
	 * @param    {Value}      parent    The optional parent Value instance
	 */
	constructor(holder, key, value, parent, root) {
		this.holder = holder;
		this.key = key;
		this.value = value;
		this.parent = parent;
		this.root = root;

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
}

/**
 * Represent the root
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.1
 */
class RootValue {

	/**
	 * Construct the root instance
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.1
	 *
	 * @param    {*}          root      The actual value that needs to be dried
	 * @param    {Function}   replacer  Optional replacer function
	 */
	constructor(root, replacer) {
		this.value = root;
		this.root = this;
		this.current_type = undefined;
		this.duplicates = [];

		this.values = new Map();

		if (replacer) {
			this.replacer = replacer;
			this.has_replacer = true;
		} else {
			this.has_replacer = false;
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

		let result;

		// Only check non-falsy values
		if (value) {
			let type = typeof value;

			if (type == 'number' || type == 'boolean' || type == 'string') {
				// Primitives don't need special reviving
				result = value;
			} else {
				result = this.createReviverValueWrapper(original_holder, key, value, parent);
				result = result.undriedValue(new_holder, key);
			}
		} else {
			result = value;
		}

		// Make sure the "replacer" (in this case, a "reviver") is executed
		if (this.has_replacer) {
			result = this.replacer(key, result);
		}

		return result;
	}

	/**
	 * Create a reviver wrapper
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    2.0.0
	 * @version  2.0.1
	 *
	 * @param    {Object}     holder    The object that holds the value
	 * @param    {String}     key       The key this value is held under
	 * @param    {*}          value     The actual value to replace
	 */
	createReviverValueWrapper(holder, key, value, parent) {

		if (!value) {
			return new Value(holder, key, value, parent, this);
		}

		let type = typeof value;

		let result;

		if (type == 'object') {
			let dry_type = value.dry,
			    ref = value['~r'];

			if (typeof ref == 'number') {
				result = new RefValue(holder, key, value, parent, this);
			} else if (typeof dry_type == 'string') {
				if (dry_type == 'root') {
					result = this;
				} else if (dry_type == 'toDry') {
					result = new CustomReviverValue(holder, key, value, parent, this);
				} else if (UNDRIERS.has(dry_type)) {
					result = new UndrierValue(holder, key, value, parent, this);
				} else if (dry_type === '+Infinity') {
					return new NumberValue(holder, key, Infinity, parent, this);
				} else if (dry_type === '-Infinity') {
					return new NumberValue(holder, key, -Infinity, parent, this);
				} else if (dry_type === 'regexp') {
					return new RegExpValue(holder, key, value, parent, this);
				} else if (dry_type === 'date') {
					return new DateValue(holder, key, value, parent, this);
				} else if (dry_type === 'escape') {
					return new EscapedObjectValue(holder, key, value.value, parent, this);
				} else {
					result = new UnknownUndrierValue(holder, key, value, parent, this);
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
	 * @version  2.0.1
	 *
	 * @param    {Object}     holder    The object that holds the value
	 * @param    {String}     key       The key this value is held under
	 * @param    {*}          value     The actual value to replace
	 */
	createValueWrapper(holder, key, value, parent) {

		let current_type = typeof value;

		switch (current_type) {
			case 'function':
				return new FunctionValue(holder, key, value, parent, this);
			
			case 'object':
				if (Array.isArray(value)) {
					return new ArrayValue(holder, key, value, parent, this);
				} else {
					return new ObjectValue(holder, key, value, parent, this);
				}
			
			case 'string':
				return new StringValue(holder, key, value, parent, this);
			
			case 'number':
				return new NumberValue(holder, key, value, parent, this);
			
			default:
				return new Value(holder, key, value, parent, this);
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
 * @version  2.0.1
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

		if (DRIERS.has(class_name)) {
			result = DRIERS.get(class_name).fnc(this.holder, this.key, value);

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

		let needs_escape = false,
		    new_value = {},
			target_key,
		    keys = Object.keys(value),
		    key,
		    i;

		this.replaced_value = new_value;

		for (i = 0; i < keys.length; i++) {
			target_key = key = keys[i];

			if (key == '~r') {
				needs_escape = true;
				target_key = '~~r';
			}

			new_value[target_key] = this.root.replace(value, key, value[key], this);
		}

		if (needs_escape) {
			new_value = {dry: 'escape', value: new_value};
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
 * Represent an object value that has values that need to be escaped
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
class EscapedObjectValue extends ObjectValue {

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
				if (key === '~~r') {
					key = '~r';
				}

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
			return RegExp.apply(undefined, GET_REGEX.exec(value.value).slice(1));
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
 * @version  2.0.1
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

		let undrier = UNDRIERS.get(value.dry).fnc,
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
 * @version  2.0.1
 */
class CustomReviverValue extends UndrierValue {

	reviveWithReviver(value) {

		value = (new ObjectValue(this.holder, this.key, value, this, this.root)).undriedValue();

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
 * Deep clone an object
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.0.0
 * @version  2.0.1
 *
 * @param    {Object}   obj
 * @param    {String}   custom_method   Custom method to use if available
 * @param    {Array}    extra_args      Extra arguments for the custom method
 * @param    {Map}      wm
 *
 * @return   {Object}
 */
function clone(obj, custom_method, extra_args, wm) {

	if (custom_method && typeof custom_method === 'object') {
		wm = custom_method;
		custom_method = null;
	} else if (extra_args && !Array.isArray(extra_args)) {
		wm = extra_args;
		extra_args = null;
	}

	if (!wm) {
		wm = new Map();
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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.0.0
 * @version  2.0.1
 *
 * @param    {Object}   obj
 * @param    {String}   custom_method   Custom method to use if available
 * @param    {Array}    extra_args      Extra arguments for the custom method
 * @param    {Map}      wm
 *
 * @return   {Object}
 */
function real_clone(obj, custom_method, extra_args, wm) {

	let entry_type,
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
		len = obj.length;
		target = [];
		keys = [];

		for (i = 0; i < len; i++) {
			keys.push(i);
		}
	} else {
		target = {};
		keys = Object.keys(obj);
		len = keys.length;
	}

	// Remember the root object and its clone
	wm.set(obj, target);

	for (i = 0; i < len; i++) {
		key = keys[i];
		entry = obj[key];

		if (!entry) {
			target[key] = entry;
			continue;
		}

		entry_type = typeof entry;

		if (entry_type !== 'object' && entry_type !== 'function') {
			target[key] = entry;
			continue;
		}

		if (entry_type === 'function' && !DRIERS.has('Function')) {
			continue;
		}

		// If this has been cloned before, use that
		if (wm.has(entry)) {
			target[key] = wm.get(entry);
			continue;
		}

		let new_value;

		if (entry.constructor != null) {
			name_type = entry.constructor.name;

			if (custom_method && entry[custom_method] != null) {
				new_value = entry[custom_method].apply(entry, extra_args);
			} else if (DRIERS.has(name_type)) {
				// Look for a registered drier function
				temp = DRIERS.get(name_type).fnc(obj, key, entry);

				if (UNDRIERS.has(name_type)) {
					new_value = UNDRIERS.get(name_type).fnc(target, key, temp);
				} else {
					new_value = temp;
				}
			} else if (entry.dryClone) {
				// Look for dryClone after
				new_value = entry.dryClone(wm, custom_method);
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
					new_value = entry.constructor.unDry(cloned_dried, custom_method || true, wm.whenDone);
				} else {
					// If there is no undry function, the clone will be a simple object
					new_value = cloned_dried;
				}

				// Remember both entries (for circular undry references)
				wm.drymap.set(cloned_dried, new_value);
				wm.drymap.set(uncloned_dried, new_value);

			} else if (name_type === 'Date') {
				new_value = new Date(entry);
			} else if (name_type === 'RegExp') {
				temp = entry.toString();
				split = temp.match(/^\/(.*?)\/([gim]*)$/);

				if (split) {
					new_value = RegExp(split[1], split[2]);
				} else {
					new_value = RegExp(temp);
				}
			} else if (typeof entry.clone == 'function') {
				// If it supplies a clone method, use that
				new_value = entry.clone();
			} else if (entry.toJSON) {
				temp = entry.toJSON();

				if (temp && typeof temp === 'object') {
					temp = real_clone(temp, custom_method, extra_args, wm);
				}

				new_value = temp;
			} else {
				new_value = real_clone(entry, custom_method, extra_args, wm);
			}
		} else {
			new_value = real_clone(entry, custom_method, extra_args, wm);
		}

		target[key] = new_value;

		// Remember this clone for later
		wm.set(entry, new_value);
	}

	return target;
}

/**
 * Register a drier
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.0.0
 * @version  2.0.1
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

	DRIERS.set(path, {
		fnc     : fnc,
		options : options || {}
	});
}

/**
 * Register an undrier
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.0.0
 * @version  2.0.1
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

	UNDRIERS.set(path, {
		fnc     : fnc,
		options : options || {}
	});
}

/**
 * Register a class that can be serialized/revived
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
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
 * Extract something from an object by the path
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Object}   value
 * @param    {Function} replacer
 *
 * @return   {Object}
 */
function toDryObject(value, replacer) {
	let root = new RootValue(value, replacer);
	return root.driedValue();
};

/**
 * Convert directly to a string
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Object}   value
 * @param    {Function} replacer
 *
 * @return   {Object}
 */
function stringify(value, replacer, space) {
	let obj = toDryObject(value, replacer);
	return JSON.stringify(obj, null, space);
}

/**
 * Map an object
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Object}   value
 *
 * @return   {Object}
 */
function parse(value, reviver) {

	if (typeof value === 'string') {
		value = JSON.parse(value);
	}

	let root = new RootValue(value, reviver);
	let result = root.undriedValue();

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