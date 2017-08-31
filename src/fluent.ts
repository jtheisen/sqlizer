import { createProxy, getTrivialProxySchema, ProxySchema } from './proxy';
import { EntityDescriptor } from './entities';
import {
    AtomicExpression,
    BindingExpression,
    ComparisonExpression,
    ExistsExpression,
    FromExpression,
    IsInExpression,
    JoinExpression,
    LogicalBinaryExpression,
    MemberExpression,
    NamedSetExpression,
    ObjectExpression,
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


function getProxySchemaForObject(expression: ScalarExpression, target: any) {
    return {
        properties: Object.keys(target),
        proxyPrototype: ColumnScalar.prototype,
        process(proxy: any) {
            proxy.expression = expression
        },
        getPropertySchema(name: string) {
            return getProxySchemaForObject(new MemberExpression(expression, name), target[name])
        }
    }
}

function createScalar<T>(expression: AtomicExpression, target: any): Scalar<T> {
    var scalar = createProxy(getProxySchemaForObject(expression, target))
    return scalar
}


export class ColumnScalar<T> {
    expression: ScalarExpression

    eq(rhs: ColumnScalar<T>): Predicate { return new Predicate(new ComparisonExpression('=', this.expression, rhs.expression)) }
    ne(rhs: ColumnScalar<T>): Predicate { return new Predicate(new ComparisonExpression('<>', this.expression, rhs.expression)) }
    lt(rhs: ColumnScalar<T>): Predicate { return new Predicate(new ComparisonExpression('<', this.expression, rhs.expression)) }
    gt(rhs: ColumnScalar<T>): Predicate { return new Predicate(new ComparisonExpression('>', this.expression, rhs.expression)) }
    le(rhs: ColumnScalar<T>): Predicate { return new Predicate(new ComparisonExpression('<=', this.expression, rhs.expression)) }
    ge(rhs: ColumnScalar<T>): Predicate { return new Predicate(new ComparisonExpression('>=', this.expression, rhs.expression)) }

    //isIn(rhs: SqlSet<T>): Predicate { return new Predicate(new IsInExpression(this.expression, rhs.expression)) }
}

export type Scalar<T> = T & ColumnScalar<T>

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

export type SqlSet<E> = ConcreteSqlSet<E> // | Scalar<E[]>

export function defineTable<E>(name: string, schema: E): ConcreteSqlSet<{ [P in keyof E]: Scalar<E[P]> }> {
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
    var fromExpression = evaluation.expression.from = new FromExpression(source.expression)
    var atomicExpression = new AtomicExpression(fromExpression)
    var scalar = createScalar<S>(atomicExpression, source.schema)
    return scalar
}

export function join<S>(source: SqlSet<S>): { on: (condition: (s: Scalar<S>) => Predicate) => Scalar<S> } {
    return {
        on: (condition: (s: Scalar<S>) => Predicate) => {
            if (!(source instanceof ConcreteSqlSet)) source = asSet(source)

            var evaluation = getCurrentEvaluation();
            
            var joinExpression = new JoinExpression(source.expression)
            joinExpression.kind = 'JOIN'
            var atomicExpression = new AtomicExpression(joinExpression)
            var scalar = createScalar<S>(atomicExpression, source.schema)
            joinExpression.on = condition(scalar).expression
        
            evaluation.expression.joins.push(joinExpression)
        
            return scalar
        }
    }
}

function hasCtor(o: any) {
    return o.__proto__ && o.__proto__.constructor !== Object
}

function getScalarExpressionFromScalar<T>(e: T): ScalarExpression {
    if (e instanceof ColumnScalar)
        return e.expression
    else if (e instanceof Array) {
        throw "Arrays are not allowed in this context."
    } else if (hasCtor(e)) {
        throw "Only plain Javascript objects are allowed in this context."
    } else {
        var result = new ObjectExpression([], {})
        for (var p in e) {
            var v = e[p]
            result.keys.push(p)
            result.map[p] = getScalarExpressionFromScalar(v)
        }
        return result
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
        evaluation.expression.select = getScalarExpressionFromScalar(result)

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
