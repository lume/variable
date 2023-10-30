var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { untrack } from 'solid-js';
import { variable, autorun, reactive, reactify, circular } from './index.js';
describe('@lume/variable', () => {
    describe('variable()', () => {
        it('has gettable and settable values', async () => {
            expect(variable).toBeInstanceOf(Function);
            const num = variable(0);
            num(1);
            expect(num()).toBe(1);
            num(num() + 1);
            expect(num()).toBe(2);
            num.set(3);
            expect(num.get()).toBe(3);
        });
        it('object destructuring convenience', async () => {
            let count;
            {
                const { get, set } = variable(0);
                count = get;
                Promise.resolve().then(() => {
                    set(1);
                    set(count() + 1);
                    set(3);
                });
            }
            let expectedCount = -1;
            autorun(() => {
                expectedCount++;
                expect(count()).toBe(expectedCount);
            });
            await Promise.resolve();
            expect(count()).toBe(3);
            expect(expectedCount).toBe(3);
        });
        it('array destructuring convenience', async () => {
            let count;
            {
                const [get, set] = variable(0);
                count = get;
                Promise.resolve().then(() => {
                    set(1);
                    set(count() + 1);
                    set(3);
                });
            }
            let expectedCount = -1;
            autorun(() => {
                expectedCount++;
                expect(count()).toBe(expectedCount);
            });
            await Promise.resolve();
            expect(count()).toBe(3);
            expect(expectedCount).toBe(3);
        });
    });
    describe('circular()', () => {
        it('allows two variables to be synced to each other (two-way binding)', () => {
            const number = variable(0);
            const double = variable(0);
            let count = 0;
            autorun(() => {
                count++;
                number();
                double();
            });
            circular(number, () => number(double() / 2), double, () => double(number() * 2));
            expect(count).toBe(2);
            number(2);
            expect(count).toBe(4);
            expect(number()).toBe(2);
            expect(double()).toBe(4);
            double(2);
            expect(count).toBe(6);
            expect(number()).toBe(1);
            expect(double()).toBe(2);
        });
    });
    describe('autorun()', () => {
        it('re-runs on changes of variables used within, and can be stopped from re-running', () => {
            expect(autorun).toBeInstanceOf(Function);
            const count = variable(0);
            let runCount = 0;
            const stop = autorun(() => {
                count();
                runCount++;
            });
            count(1);
            count(2);
            expect(runCount).toBe(3);
            stop();
            count(3);
            count(4);
            expect(runCount).toBe(3);
        });
    });
    describe('@reactive and reactify', () => {
        it('is a function', () => {
            expect(reactive).toBeInstanceOf(Function);
        });
        it('does not prevent superclass constructor from receiving subclass constructor args', () => {
            let Insect = class Insect {
                constructor(result) {
                    this.result = result;
                }
            };
            Insect = __decorate([
                reactive,
                __metadata("design:paramtypes", [Number])
            ], Insect);
            class Butterfly extends Insect {
                constructor(arg) {
                    super(arg * 2);
                }
            }
            const b = new Butterfly(4);
            expect(b.result).toBe(8);
        });
        it('makes class properties reactive, using class and property/accessor decorators', () => {
            let Butterfly = class Butterfly {
                constructor() {
                    this.colors = 3;
                    this._wingSize = 2;
                }
                get wingSize() {
                    return this._wingSize;
                }
                set wingSize(s) {
                    this._wingSize = s;
                }
            };
            __decorate([
                reactive,
                __metadata("design:type", Object)
            ], Butterfly.prototype, "colors", void 0);
            __decorate([
                reactive,
                __metadata("design:type", Number),
                __metadata("design:paramtypes", [Number])
            ], Butterfly.prototype, "wingSize", null);
            Butterfly = __decorate([
                reactive
            ], Butterfly);
            const b = new Butterfly();
            testButterflyProps(b);
        });
        it('show that reactify makes an infinite reactivity loop when used manually', () => {
            class Foo {
                constructor() {
                    this.amount = 3;
                    reactify(this, ['amount']);
                }
            }
            class Bar extends Foo {
                constructor() {
                    super();
                    this.double = 0;
                    reactify(this, ['double']);
                    this.double = this.amount * 2;
                }
            }
            let count = 0;
            function loop() {
                autorun(() => {
                    new Bar();
                    count++;
                });
            }
            count;
            expect(loop).toThrowError(RangeError);
            expect(count).toBeGreaterThan(1);
        });
        it('show how to manually untrack constructors when not using decorators', () => {
            class Foo {
                constructor() {
                    this.amount = 3;
                    reactify(this, ['amount']);
                }
            }
            class Bar extends Foo {
                constructor() {
                    super();
                    this.double = 0;
                    reactify(this, ['double']);
                    untrack(() => {
                        this.double = this.amount * 2;
                    });
                }
            }
            let count = 0;
            function noLoop() {
                autorun(() => {
                    new Bar();
                    count++;
                });
            }
            expect(noLoop).not.toThrow();
            expect(count).toBe(1);
        });
        it('automatically does not track reactivity in constructors when using decorators', () => {
            let Foo = class Foo {
                constructor() {
                    this.amount = 3;
                }
            };
            __decorate([
                reactive,
                __metadata("design:type", Object)
            ], Foo.prototype, "amount", void 0);
            Foo = __decorate([
                reactive
            ], Foo);
            let Bar = class Bar extends Foo {
                constructor() {
                    super();
                    this.double = 0;
                    this.double = this.amount * 2;
                }
            };
            __decorate([
                reactive,
                __metadata("design:type", Object)
            ], Bar.prototype, "double", void 0);
            Bar = __decorate([
                reactive,
                __metadata("design:paramtypes", [])
            ], Bar);
            let b;
            let count = 0;
            function noLoop() {
                autorun(() => {
                    b = new Bar();
                    count++;
                });
            }
            expect(noLoop).not.toThrow();
            const b2 = b;
            b.amount = 4;
            expect(b).toBe(b2);
            expect(count).toBe(1);
        });
        it('automatically does not track reactivity in constructors when using decorators even when not the root most decorator', () => {
            let Foo = class Foo {
                constructor() {
                    this.amount = 3;
                }
            };
            __decorate([
                reactive,
                __metadata("design:type", Object)
            ], Foo.prototype, "amount", void 0);
            Foo = __decorate([
                reactive
            ], Foo);
            function someOtherDecorator(Class) {
                console.log(Class);
                if (arguments.length === 1 && 'kind' in Class && Class.kind === 'class')
                    return { ...Class, finisher: (Klass) => class Foo extends Klass {
                        } };
                return class Foo extends Class {
                };
            }
            let Bar = class Bar extends Foo {
                constructor() {
                    super();
                    this.double = 0;
                    this.double = this.amount * 2;
                }
            };
            __decorate([
                reactive,
                __metadata("design:type", Object)
            ], Bar.prototype, "double", void 0);
            Bar = __decorate([
                someOtherDecorator,
                reactive,
                __metadata("design:paramtypes", [])
            ], Bar);
            let b;
            let count = 0;
            function noLoop() {
                autorun(() => {
                    b = new Bar();
                    count++;
                });
            }
            expect(noLoop).not.toThrow();
            const b2 = b;
            b.amount = 4;
            expect(b).toBe(b2);
            expect(count).toBe(1);
        });
        it('makes class properties reactive, not using any decorators, specified in the constructor', () => {
            class Butterfly {
                constructor() {
                    this.colors = 3;
                    this._wingSize = 2;
                    reactify(this, ['colors', 'wingSize']);
                }
                get wingSize() {
                    return this._wingSize;
                }
                set wingSize(s) {
                    this._wingSize = s;
                }
            }
            const b = new Butterfly();
            testButterflyProps(b);
        });
        it('makes class properties reactive, with properties defined in the constructor', () => {
            class Butterfly {
                constructor() {
                    this.colors = 3;
                    this._wingSize = 2;
                    reactify(this, ['colors', 'wingSize']);
                }
                get wingSize() {
                    return this._wingSize;
                }
                set wingSize(s) {
                    this._wingSize = s;
                }
            }
            const b = new Butterfly();
            testButterflyProps(b);
        });
        it('makes class properties reactive, using only class decorator, specified via static prop', () => {
            let Butterfly = class Butterfly {
                constructor() {
                    this.colors = 3;
                    this._wingSize = 2;
                }
                static { this.reactiveProperties = ['colors', 'wingSize']; }
                get wingSize() {
                    return this._wingSize;
                }
                set wingSize(s) {
                    this._wingSize = s;
                }
            };
            Butterfly = __decorate([
                reactive
            ], Butterfly);
            const b = new Butterfly();
            testButterflyProps(b);
        });
        it('makes class properties reactive, using only class decorator, specified via static prop, properties defined in the constructor', () => {
            let Butterfly = class Butterfly {
                constructor() {
                    this.colors = 3;
                    this._wingSize = 2;
                }
                static { this.reactiveProperties = ['colors', 'wingSize']; }
                get wingSize() {
                    return this._wingSize;
                }
                set wingSize(s) {
                    this._wingSize = s;
                }
            };
            Butterfly = __decorate([
                reactive,
                __metadata("design:paramtypes", [])
            ], Butterfly);
            const b = new Butterfly();
            testButterflyProps(b);
        });
        it('makes class properties reactive, not using any decorators, specified via static prop', () => {
            class Butterfly {
                constructor() {
                    this.colors = 3;
                    this._wingSize = 2;
                    reactify(this, Butterfly);
                }
                static { this.reactiveProperties = ['colors', 'wingSize']; }
                get wingSize() {
                    return this._wingSize;
                }
                set wingSize(s) {
                    this._wingSize = s;
                }
            }
            const b = new Butterfly();
            testButterflyProps(b);
        });
        it('makes class properties reactive, not using any decorators, specified via static prop, properties defined in the constructor', () => {
            class Butterfly {
                constructor() {
                    this.colors = 3;
                    this._wingSize = 2;
                    reactify(this, Butterfly);
                }
                static { this.reactiveProperties = ['colors', 'wingSize']; }
                get wingSize() {
                    return this._wingSize;
                }
                set wingSize(s) {
                    this._wingSize = s;
                }
            }
            const b = new Butterfly();
            testButterflyProps(b);
        });
        it('can be used on a function-style class, with properties in the constructor', () => {
            function Butterfly() {
                this.colors = 3;
                this._wingSize = 2;
                reactify(this, Butterfly);
            }
            Butterfly.reactiveProperties = ['colors', 'wingSize'];
            Butterfly.prototype = {
                get wingSize() {
                    return this._wingSize;
                },
                set wingSize(s) {
                    this._wingSize = s;
                },
            };
            const b = new Butterfly();
            testButterflyProps(b);
        });
        it('can be used on a function-style class, with properties on the prototype, reactify with static reactiveProperties in constructor', () => {
            function Butterfly() {
                reactify(this, Butterfly);
            }
            Butterfly.reactiveProperties = ['colors', 'wingSize'];
            Butterfly.prototype = {
                colors: 3,
                _wingSize: 2,
                get wingSize() {
                    return this._wingSize;
                },
                set wingSize(s) {
                    this._wingSize = s;
                },
            };
            const b = new Butterfly();
            testButterflyProps(b);
        });
        it('can be used on a function-style class, with properties on the prototype, reactify with static reactiveProperties on the prototype', () => {
            function Butterfly() { }
            Butterfly.reactiveProperties = ['colors', 'wingSize'];
            Butterfly.prototype = {
                colors: 3,
                _wingSize: 2,
                get wingSize() {
                    return this._wingSize;
                },
                set wingSize(s) {
                    this._wingSize = s;
                },
            };
            reactify(Butterfly.prototype, Butterfly);
            const b = new Butterfly();
            testButterflyProps(b);
        });
        it('can be used on a function-style class, with properties on the prototype, reactify with specific props in constructor', () => {
            function Butterfly() {
                reactify(this, ['colors', 'wingSize']);
            }
            Butterfly.prototype = {
                colors: 3,
                _wingSize: 2,
                get wingSize() {
                    return this._wingSize;
                },
                set wingSize(s) {
                    this._wingSize = s;
                },
            };
            const b = new Butterfly();
            testButterflyProps(b);
        });
        it('can be used on a function-style class, with properties on the prototype, reactify with specific props on the prototype', () => {
            function Butterfly() { }
            Butterfly.prototype = {
                colors: 3,
                _wingSize: 2,
                get wingSize() {
                    return this._wingSize;
                },
                set wingSize(s) {
                    this._wingSize = s;
                },
            };
            reactify(Butterfly.prototype, ['colors', 'wingSize']);
            const b = new Butterfly();
            testButterflyProps(b);
        });
        it('can be used on a function-style class, with properties in the constructor, reactive applied to constructor', () => {
            let Butterfly = function Butterfly() {
                this.colors = 3;
                this._wingSize = 2;
            };
            Butterfly.reactiveProperties = ['colors', 'wingSize'];
            Butterfly.prototype = {
                get wingSize() {
                    return this._wingSize;
                },
                set wingSize(s) {
                    this._wingSize = s;
                },
            };
            Butterfly = reactive(Butterfly);
            const b = new Butterfly();
            testButterflyProps(b);
        });
        it('can be used on a function-style class, with properties on the prototype, reactive applied to constructor', () => {
            let Butterfly = function Butterfly() { };
            Butterfly.reactiveProperties = ['colors', 'wingSize'];
            Butterfly.prototype = {
                colors: 3,
                _wingSize: 2,
                get wingSize() {
                    return this._wingSize;
                },
                set wingSize(s) {
                    this._wingSize = s;
                },
            };
            Butterfly = reactive(Butterfly);
            const b = new Butterfly();
            testButterflyProps(b);
        });
        it('can be used on a function-style class, with properties in the constructor, reactive applied to specific prototype properties', () => {
            let Butterfly = function Butterfly() {
                this.colors = 3;
                this._wingSize = 2;
            };
            Butterfly.reactiveProperties = ['colors', 'wingSize'];
            Butterfly.prototype = {
                get wingSize() {
                    return this._wingSize;
                },
                set wingSize(s) {
                    this._wingSize = s;
                },
            };
            reactive(Butterfly.prototype, 'colors');
            reactive(Butterfly.prototype, 'wingSize');
            Butterfly = reactive(Butterfly);
            const b = new Butterfly();
            testButterflyProps(b);
        });
        it('can be used on a function-style class, with properties on the prototype, reactive applied to specific prototype properties', () => {
            let Butterfly = function Butterfly() { };
            Butterfly.reactiveProperties = ['colors', 'wingSize'];
            Butterfly.prototype = {
                colors: 3,
                _wingSize: 2,
                get wingSize() {
                    return this._wingSize;
                },
                set wingSize(s) {
                    this._wingSize = s;
                },
            };
            reactive(Butterfly.prototype, 'colors');
            reactive(Butterfly.prototype, 'wingSize');
            Butterfly = reactive(Butterfly);
            const b = new Butterfly();
            testButterflyProps(b);
        });
    });
});
function testButterflyProps(b) {
    let count = 0;
    autorun(() => {
        b.colors;
        b.wingSize;
        count++;
    });
    expect(b.colors).toBe(3);
    expect(b.wingSize).toBe(2);
    expect(b._wingSize).toBe(2);
    expect(count).toBe(1);
    b.colors++;
    expect(b.colors).toBe(4);
    expect(count).toBe(2);
    b.wingSize++;
    expect(b.wingSize).toBe(3);
    expect(b._wingSize).toBe(3);
    expect(count).toBe(3);
}
//# sourceMappingURL=index.test.js.map