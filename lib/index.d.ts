declare module 'json-dry' {
  export interface JSONDry {
    // Convert directly to a string
    stringify: (value: object, replacer?: Replacer, space?: Space) => string;

    // Convert an object to a DRY object, ready for stringifying
    toObject: (value: object, replacer?: Replacer) => object;

    // Convert from a dried object
    parse: (object: object, reviver?: Reviver) => any;

    /**
     * Deep clone an object
     *
     * @param object
     * @param custom_method Custom method to use if available
     * @param extra_args Extra arguments for the custom method
     * @param wm
     */
    clone: (object: object, custom_method?: string, extra_args?: any[], wm?: WeakMap) => any;

    Classes: object;

    /**
     * Register a class that can be serialized/revived
     *
     * @param name The name of the class
     * @param constructor What constructor to listen to
     */
    registerClass: {
      (name: string, constructor: Function): void,
      (constructor: Function): void,
    };

    /**
     * Register an undrier
     *
     * @param constructor What constructor to listen to
     * @param fnc
     * @param options
     */
    registerUndrier: {
      (name: string, constructor: Function, options: Options): void;
      (constructor: Function, _: undefined, options: Options): void;
    }

    /**
     * Find a class
     *
     * @param value The name of the class
     */
    findClass: (value: string | {
      path: string,
    } | {
      namespace: string,
    } | {
      dry_class: string,
    }) => Function;

    /**
     * Map an object
     *
     * @param object The object to walk over
     * @param fnc The function to perform on every entry
     * @param result The object to add to
     */
    walk: (object: object, fnc: Function, result?: Object) => object;
  }

  type Replacer = Parameters<JSON['stringify']>[1];
  type Space = Parameters<JSON['stringify']>[2];
  type Reviver = Record<unknown, unknown>;
  type Options = {
    add_path?: boolean;
  }

  const Dry: JSONDry;

  export = Dry;
}
