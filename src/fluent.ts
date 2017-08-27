import { createProxy, getTrivialProxySchema, ProxySchema } from './proxy';
import { EntityDescriptor } from './entities';
import {
    BindingExpression,
    ComparisonExpression,
    ExistsExpression,
    FromExpression,
    IsInExpression,
    JoinExpression,
    LogicalBinaryExpression,
    MemberExpression,
    NamedSetExpression,
    PredicateExpression,
    QueriedSetExpression,
    ScalarExpression,
    SelectExpression,
    SetExpression,
} from './expression';

// case 1: creating a scalar from a javascript object, eg. through a map
//   scan the object and create a proxy that returns proxied objects from its getters for all props
// case 2: creating a scalar from a from or join expression
//


function getProxySchemaForObject(target: any) {
    return {
        properties: Object.keys(target),
        proxyPrototype: ConcreteScalar.prototype,
        getPropertySchema(name: string) {
            return getProxySchemaForObject(target[name])
        }
    }
}

function createScalar<T>(expression: ScalarExpression, target: any): Scalar<T> {
    var scalar = createProxy(getProxySchemaForObject(target))
    scalar.expression = expression
    return scalar
}


export class ConcreteScalar<T> {
    expression: ScalarExpression

    eq(rhs: Scalar<T>): Predicate { return new Predicate(new ComparisonExpression('=', this.expression, rhs.expression)) }
    ne(rhs: Scalar<T>): Predicate { return new Predicate(new ComparisonExpression('<>', this.expression, rhs.expression)) }
    lt(rhs: Scalar<T>): Predicate { return new Predicate(new ComparisonExpression('<', this.expression, rhs.expression)) }
    gt(rhs: Scalar<T>): Predicate { return new Predicate(new ComparisonExpression('>', this.expression, rhs.expression)) }
    le(rhs: Scalar<T>): Predicate { return new Predicate(new ComparisonExpression('<=', this.expression, rhs.expression)) }
    ge(rhs: Scalar<T>): Predicate { return new Predicate(new ComparisonExpression('>=', this.expression, rhs.expression)) }

    isIn(rhs: SqlSet<T>): Predicate { return new Predicate(new IsInExpression(this.expression, rhs.expression)) }
}

// The point being that this prohibits unwittingly calling inappropriate functions in query expressions.
//export type Scalar<T> = { [P in keyof T]: Scalar<T[P]> } & ConcreteScalar<T>

export type ScalarN<T> = { [P in keyof T]: ScalarN<T[P]> } & ConcreteScalar<T>
export type Scalar4<T> = { [P in keyof T]: ScalarN<T[P]> } & ConcreteScalar<T>
export type Scalar3<T> = { [P in keyof T]: Scalar4<T[P]> } & ConcreteScalar<T>
export type Scalar2<T> = { [P in keyof T]: Scalar3<T[P]> } & ConcreteScalar<T>
export type Scalar1<T> = { [P in keyof T]: Scalar2<T[P]> } & ConcreteScalar<T>
export type Scalar<T> = { [P in keyof T]: Scalar1<T[P]> } & ConcreteScalar<T>

class Predicate {

    constructor(public expression: PredicateExpression) { }

    and(rhs: Predicate): Predicate { return new Predicate(new LogicalBinaryExpression('AND', this.expression, rhs.expression)) }
    or(rhs: Predicate): Predicate { throw new Predicate(new LogicalBinaryExpression('OR', this.expression, rhs.expression)) }

}

var SqlTrue: Predicate;

export class ConcreteSqlSet<E> {
    constructor(public expression: SetExpression, public schema: any) { }

    any(): Predicate { return new Predicate(new ExistsExpression(this.expression)) }
}

export type SqlSet<E> = ConcreteSqlSet<E> | Scalar<E[]>

export function defineTable<E>(name: string, schema: E): SqlSet<E> {
    var expression = new NamedSetExpression()
    expression.name = name
    return new ConcreteSqlSet(expression, schema)
}

function immediate<T>(value: T): Scalar<T> { throw null; }


var scalar: {
    <E>(element: E): Scalar<E>,
    <E>(element: Scalar<E>): Scalar<E>,
} = (e: any) => e


export function from<S>(source: SqlSet<S>): Scalar<S> {
    if (!(source instanceof ConcreteSqlSet)) source = asSet(source)
    var evaluation = getCurrentEvaluation();
    evaluation.expression.from = new FromExpression()
    evaluation.expression.from.source = source.expression
    var scalar = createScalar<S>(evaluation.expression.from, source.schema)
    return scalar
}

export function join<S>(source: SqlSet<S>): { on: (condition: (s: Scalar<S>) => Predicate) => Scalar<S> } {
    return {
        on: (condition: (s: Scalar<S>) => Predicate) => {
            if (!(source instanceof ConcreteSqlSet)) source = asSet(source)

            var evaluation = getCurrentEvaluation();
            
            var joinExpression = new JoinExpression()
            joinExpression.source = source.expression
            joinExpression.kind = 'join'
            var scalar = createScalar<S>(joinExpression, source.schema)
            joinExpression.on = condition(scalar).expression
        
            evaluation.expression.joins.push(joinExpression)
        
            return scalar
        }
    }
}





var evaluationStack: {
    expression: SelectExpression
}[] = [];

function getCurrentEvaluation() {
    return evaluationStack[evaluationStack.length - 1]
}

export var query: {
    <E>(monad: () => Scalar<E>): SqlSet<E>
    <E>(monad: () => E): SqlSet<E>
}
= <E>(monad: () => Scalar<E>) => {
    evaluationStack.push({ expression: new SelectExpression() })
    try {
        var result = monad()

        var evaluation = getCurrentEvaluation();

        var setExpression = new QueriedSetExpression()
        setExpression.definition = evaluation.expression

        return new ConcreteSqlSet<E>(setExpression, result)
    }
    finally {
        evaluationStack.pop();
    }
}

export function asSet<E>(s: Scalar<E[]>): ConcreteSqlSet<E> {
    return s as any as ConcreteSqlSet<E>
}

function getSetExpression<T>(source: SqlSet<T>): SetExpression {
    return (source as SqlSet<T>).expression
}
