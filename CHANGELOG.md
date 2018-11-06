## 1.0.8 (WIP)

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
