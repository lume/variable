import { getInheritedDescriptor } from 'lowclass';
import { createSignal, createEffect, createRoot, untrack, getListener } from 'solid-js';
function readVariable() {
    return this();
}
function writeVariable(value) {
    return this(value);
}
export function variable(value) {
    const [get, set] = createSignal(value, { equals: false });
    const variable = ((value) => {
        if (typeof value === 'undefined')
            return get();
        set(() => value);
        return value;
    });
    const getter = readVariable.bind(variable);
    const setter = writeVariable.bind(variable);
    variable.get = getter;
    variable.set = setter;
    variable[0] = getter;
    variable[1] = setter;
    variable[Symbol.iterator] = function* () {
        yield variable[0];
        yield variable[1];
    };
    return variable;
}
export function autorun(f) {
    let stop;
    createRoot(dispose => {
        stop = dispose;
        createEffect(f);
    });
    return stop;
}
export function reactive(protoOrClassElement, propName, _descriptor) {
    const isDecoratorV2 = arguments.length === 1 && 'kind' in protoOrClassElement;
    if (isDecoratorV2) {
        const classElement = protoOrClassElement;
        if (classElement.kind === 'class')
            return { ...classElement, finisher: reactiveClassFinisher };
        return {
            ...classElement,
            finisher(Class) {
                var _a, _b;
                _trackReactiveProperty(Class, classElement.key);
                return (_b = (_a = classElement.finisher) === null || _a === void 0 ? void 0 : _a.call(classElement, Class)) !== null && _b !== void 0 ? _b : Class;
            },
        };
    }
    if (arguments.length === 1 && typeof protoOrClassElement === 'function') {
        const Class = protoOrClassElement;
        return reactiveClassFinisher(Class);
    }
    const Class = protoOrClassElement.constructor;
    _trackReactiveProperty(Class, propName);
}
export function _trackReactiveProperty(Class, propName) {
    if (!Class.reactiveProperties || !Class.hasOwnProperty('reactiveProperties'))
        Class.reactiveProperties = [];
    if (!Class.reactiveProperties.includes(propName))
        Class.reactiveProperties.push(propName);
}
function reactiveClassFinisher(Class) {
    var _a;
    if (Class.hasOwnProperty('__isReactive__'))
        return Class;
    return _a = class ReactiveDecoratorFinisher extends Class {
            constructor(...args) {
                if (getListener()) {
                    return untrack(() => {
                        const self = Reflect.construct(Class, args, new.target);
                        reactify(self, Class);
                        return self;
                    });
                }
                super(...args);
                reactify(this, Class);
            }
        },
        _a.__isReactive__ = true,
        _a;
}
function _reactive(obj, propName) {
    if (typeof propName !== 'string')
        throw new Error('TODO: support for non-string fields with @reactive decorator');
    const vName = 'v_' + propName;
    let descriptor = getInheritedDescriptor(obj, propName);
    let originalGet;
    let originalSet;
    let initialValue;
    if (descriptor) {
        originalGet = descriptor.get;
        originalSet = descriptor.set;
        if (originalGet || originalSet) {
            if (!originalGet || !originalSet) {
                console.warn('The `@reactive` decorator was used on an accessor named "' +
                    propName +
                    '" which had a getter or a setter, but not both. Reactivity on accessors works only when accessors have both get and set. In this case the decorator does not do anything.');
                return;
            }
            delete descriptor.get;
            delete descriptor.set;
        }
        else {
            initialValue = descriptor.value;
            if (!descriptor.writable) {
                console.warn('The `@reactive` decorator was used on a property named ' +
                    propName +
                    ' that is not writable. Reactivity is not enabled for non-writable properties.');
                return;
            }
            delete descriptor.value;
            delete descriptor.writable;
        }
    }
    descriptor = {
        configurable: true,
        enumerable: true,
        ...descriptor,
        get: originalGet
            ? function () {
                const v = __getReactiveVar(this, vName, initialValue);
                v();
                return originalGet.call(this);
            }
            : function () {
                const v = __getReactiveVar(this, vName, initialValue);
                return v();
            },
        set: originalSet
            ? function (newValue) {
                originalSet.call(this, newValue);
                const v = __getReactiveVar(this, vName);
                v(newValue);
                if (!this.__propsSetAtLeastOnce__)
                    this.__propsSetAtLeastOnce__ = new Set();
                this.__propsSetAtLeastOnce__.add(propName);
            }
            : function (newValue) {
                const v = __getReactiveVar(this, vName);
                v(newValue);
                if (!this.__propsSetAtLeastOnce__)
                    this.__propsSetAtLeastOnce__ = new Set();
                this.__propsSetAtLeastOnce__.add(propName);
            },
    };
    if (!obj.__reactifiedProps__)
        obj.__reactifiedProps__ = new Set();
    obj.__reactifiedProps__.add(propName);
    Object.defineProperty(obj, propName, descriptor);
}
function __getReactiveVar(instance, vName, initialValue = undefined) {
    let v = instance[vName];
    if (v)
        return v;
    instance[vName] = v = variable(initialValue);
    return v;
}
export function reactify(obj, propsOrClass) {
    if (isClass(propsOrClass)) {
        const Class = propsOrClass;
        const props = Class.reactiveProperties;
        if (Array.isArray(props))
            createReactiveAccessors(obj, props);
    }
    else {
        const props = propsOrClass;
        createReactiveAccessors(obj, props);
    }
    return obj;
}
function isClass(obj) {
    return typeof obj == 'function';
}
function createReactiveAccessors(obj, props) {
    var _a;
    for (const prop of props) {
        if ((_a = obj.__reactifiedProps__) === null || _a === void 0 ? void 0 : _a.has(prop))
            continue;
        const initialValue = obj[prop];
        _reactive(obj, prop);
        obj[prop] = initialValue;
    }
}
export function circular(first, setFirst, second, setSecond) {
    let initial = true;
    const stop1 = autorun(() => {
        const v = first();
        if (initial && !(initial = false))
            setSecond(v);
        else
            initial = true;
    });
    const stop2 = autorun(() => {
        const v = second();
        if (initial && !(initial = false))
            setFirst(v);
        else
            initial = true;
    });
    return function stop() {
        stop1();
        stop2();
    };
}
export const version = '0.10.0';
//# sourceMappingURL=index.js.map