## 2.0.1 (WIP)

* Optimize speed by always setting the `root` property
* Optimize speed by removing the class member initializers
* Optimize the clone methods
* Store driers & undriers in a map instead of an object

## 2.0.0 (2023-01-14)

* Rewrite serialization & parser logic
* Store any value that is referred to more than once in a separate root property

## 1.1.1 (2022-08-25)

* Make `Dry.parse()` add the current path being revived to possible errors

## 1.1.0 (2020-11-12)

* Added `whenDone` function parameter to the `unDry` & `unDryFunction` function calls
* Fixed infinite loop issue when using `Dry.clone()` that relies on `unDry` methods

## 1.0.12 (2019-11-22)

* Simple version boost to fix NPM publish issue

## 1.0.11 (2019-11-22)

* Split up `dryReplacer` function, added `replaceObject` function
* Don't assign regenerated value if it's exactly the same, prevents HTMLCollection errors
* Fix throwing an error when serializing an invalid date

## 1.0.10 (2019-01-31)

* Add extra constructor checks before drying values with a `Date` or `RegExp` class name
* Fix some recursive issues in the `clone()` method
* Fix values not being undried when it's a child of another undried object
* Fix `retrieveFromPath` throwing an error when the array contains a number

## 1.0.9 (2018-12-06)

* Also export the `walk` function
* Use `Namespace.getClassForUndry()` methods if available

## 1.0.8 (2018-11-09)

* Fix reviving nested undried classes
* The `unDry` static method will receive a second argument: false if used for regular unserializing or true/custom_method_name if used for cloning.

## 1.0.7 (2018-07-11)

* Fix registered undriers without a drypath again by reviving the values immediately

## 1.0.6 (2018-07-11)

* Fix registered undriers not being called on dried values without a drypath property

## 1.0.5 (2018-07-03)

* Remove dead code
* Add `findClass` to the exported functions
* Enable registering classes with a `namespace` property

## 1.0.4 (2018-06-18)

* Fix circular references that were incorrectly passed to an undrier

## 1.0.3 (2018-02-06)

* Fix certain references not being regenerated correctly because key iteration happens out-of-order

## 1.0.2 (2018-02-06)

* Fix objects being passed to `unDry` functions without being fully regenerated

## 1.0.1 (2018-01-23)

* Fix reference paths being replaced with paths of equal or even longer size

## 1.0.0 (2018-01-15)

* Rewrite code, take over new features from the `protoblast` package
* `WeakMap` is now used instead of multiple `Array` objects
* A `clone` method has been added

## 0.1.6 (2014-02-26)

* Register seen objects under their constructor name when stringifying for speed improvements

## 0.1.5 (2014-02-17)

* Rewrite the retrieveFromPath function to be more readable and error-safe

## 0.1.4 (2014-02-03)

* Fix generation of wrong paths when objects are empty

## 0.1.3 (2014-02-03)

* Add support for infinity
* Fix null object bug

## 0.1.2 (2014-01-21)

* Path exporting functions

## 0.1.0 (2014-01-15)

* Fork circular-json
* Initial release
