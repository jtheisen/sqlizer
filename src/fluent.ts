import { createProxy, ProxySchema } from './proxy';
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
    ScalarAsSetExpression,
    ScalarExpression,
    SelectExpression,
    SetExpression,
} from './expression';

function getSetSchema(): ProxySchema {
    var result = new ProxySchema()
    result.target = { }
    result.proxyPrototype = ColumnScalar.prototype
    result.process = (proxy: any) => {
    }
    result.getPropertySchema = undefined
    return result
}

function getProxySchemaForObject(expression: ScalarExpression, target: any): ProxySchema {
    var result = new ProxySchema()
    result.target = target,
    result.proxyPrototype = ColumnScalar.prototype,
    result.process = (proxy: any) => {
        proxy.expression = expression
    }
    result.getPropertySchema = (name: string): ProxySchema => {
        var ntarget = target[name]
        if (Array.isArray(ntarget))
            return getSetSchema()
        else
            return getProxySchemaForObject(new MemberExpression(expression, name), target[name])
    }
        
    return result
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

type SqlSetLike<S> = SqlSet<S> | S[]

export function from<S>(source: SqlSetLike<S>): Scalar<S> {
    if (!(source instanceof ConcreteSqlSet)) source = asSet(source)
    var evaluation = getCurrentEvaluation();
    if (evaluation.expression.from) return joinImpl(source)
    var fromExpression = evaluation.expression.from = new FromExpression(source.expression)
    var atomicExpression = new AtomicExpression(fromExpression)
    var scalar = createScalar<S>(atomicExpression, source.schema)
    return scalar
}

export function join<S>(source: SqlSetLike<S>): { on: (condition: (s: Scalar<S>) => Predicate) => Scalar<S> } {
    return {
        on: (condition: (s: Scalar<S>) => Predicate) => joinImpl(source, condition)
    }
}

function joinImpl<S>(source: SqlSetLike<S>, condition?: (s: Scalar<S>) => Predicate): Scalar<S> {
    if (!(source instanceof ConcreteSqlSet)) source = asSet(source)
        
    var evaluation = getCurrentEvaluation();
    
    var joinExpression = new JoinExpression(source.expression)
    joinExpression.kind = condition ? 'JOIN' : 'CROSS JOIN'
    var atomicExpression = new AtomicExpression(joinExpression)
    var scalar = createScalar<S>(atomicExpression, source.schema)
    joinExpression.on = condition ? condition(scalar).expression : undefined

    evaluation.expression.joins.push(joinExpression)

    return scalar            
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

export function asSet<E>(s: SqlSetLike<E>): ConcreteSqlSet<E> {
    if (s instanceof ConcreteSqlSet)
        return s as any as ConcreteSqlSet<E>
    else if (s instanceof ColumnScalar) {
        console.info("making set from scalar")
        console.info(s.toString())
        return new ConcreteSqlSet(new ScalarAsSetExpression(s.expression), (s as any).elementConstructor)
    }
    else
        throw "Unexpected argument of a from or join function: " + s
}
