export interface VariableGetter<T> {
    (): T;
}
export interface VariableSetter<T> {
    (value: T): T;
}
export interface Variable<T = any> extends Iterable<VariableGetter<T> | VariableSetter<T>> {
    (value?: undefined): T;
    (value: T): T;
    (value?: T): void | T;
    get: VariableGetter<T>;
    set: VariableSetter<T>;
    [0]: VariableGetter<T>;
    [1]: VariableSetter<T>;
    [Symbol.iterator](): IterableIterator<VariableGetter<T> | VariableSetter<T>>;
}
export declare function variable<T>(value: T): [VariableGetter<T>, VariableSetter<T>] & Variable<T>;
export type Computation = (previousValue?: unknown) => unknown;
export type StopFunction = () => void;
export declare function autorun(f: Computation): StopFunction;
export declare function reactive(protoOrClassElement: any, propName?: string, _descriptor?: PropertyDescriptor): any;
export declare function _trackReactiveProperty(Class: AnyClassWithReactiveProps, propName: string): void;
type AnyClass = new (...args: any[]) => object;
type AnyClassWithReactiveProps = (new (...args: any[]) => object) & {
    reactiveProperties?: string[];
    __isReactive__?: true;
};
export declare function reactify<T>(obj: T, props: (keyof T)[]): typeof obj;
export declare function reactify<C extends AnyClass>(obj: InstanceType<C>, ctor: C): typeof obj;
export declare function circular<Type>(first: VariableGetter<Type>, setFirst: (v: Type) => void, second: VariableGetter<Type>, setSecond: (v: Type) => void): StopFunction;
export declare const version = "0.10.1";
export {};
//# sourceMappingURL=index.d.ts.map