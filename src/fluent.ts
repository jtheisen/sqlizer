import { createProxy, ProxySchema } from './proxy';
import {
    ApplicationExpression,
    AtomicExpression,
    BindingExpression,
    ComparisonExpression,
    ConstantExpression,
    ElementAsSetExpression,
    ElementExpression,
    ExistsExpression,
    FromExpression,
    IsInExpression,
    JoinExpression,
    LogicalBinaryExpression,
    MemberExpression,
    NamedSetExpression,
    NotExpression,
    ObjectExpression,
    PredicateExpression,
    QueriedSetExpression,
    SelectExpression,
    SetExpression,
    SqlFunction,
} from './expression';

function getProxySchemaForArray(elementConstructor: any, expression: any): ProxySchema {
    var result = new ProxySchema()
    result.target = { elementConstructor, expression }
    result.proxyPrototype = ConcreteSqlElement.prototype
    result.process = (proxy: any) => {
    }
    result.getPropertySchema = undefined
    return result
}

function getProxySchemaForObject(expression: ElementExpression, target: any): ProxySchema {
    var result = new ProxySchema()
    result.target = target,
    result.proxyPrototype = ConcreteSqlElement.prototype,
    result.process = (proxy: any) => {
        proxy.expression = expression
    }
    result.shouldIgnoreProperty = (name: string) => name === "expression"
    result.getPropertySchema = (name: string): ProxySchema => {
        var ntarget = target[name]
        if (Array.isArray(ntarget)) {
            var elementConstructor = (ntarget as any).elementConstructor
            if (!elementConstructor) throw "Array property without element constructor encountered."
            return getProxySchemaForArray(elementConstructor, new MemberExpression(expression, name))
        }
        else
            return getProxySchemaForObject(new MemberExpression(expression, name), target[name])
    }

    return result
}

function createElement<T>(expression: ElementExpression, target: any): SqlElement<T> {
    var element = createProxy(getProxySchemaForObject(expression, target))
    return element
}

type ComparisonTarget<T> = ConcreteSqlElement<T> | string | number

function getExpressionForComparisonTarget<T>(target: ComparisonTarget<T>) {
    if (target instanceof ConcreteSqlElement)
        return target.expression
    else if (typeof(target) === 'string' || typeof(target) === 'number')
        return new ConstantExpression(target)
    else
        throw "Unexpected type in comparison target."
}

export class ConcreteSqlElement<T> {
    expression: ElementExpression

    eq(rhs: ComparisonTarget<T>): Predicate { return new Predicate(new ComparisonExpression('=', this.expression, getExpressionForComparisonTarget(rhs))) }
    ne(rhs: ComparisonTarget<T>): Predicate { return new Predicate(new ComparisonExpression('<>', this.expression, getExpressionForComparisonTarget(rhs))) }
    lt(rhs: ComparisonTarget<T>): Predicate { return new Predicate(new ComparisonExpression('<', this.expression, getExpressionForComparisonTarget(rhs))) }
    gt(rhs: ComparisonTarget<T>): Predicate { return new Predicate(new ComparisonExpression('>', this.expression, getExpressionForComparisonTarget(rhs))) }
    le(rhs: ComparisonTarget<T>): Predicate { return new Predicate(new ComparisonExpression('<=', this.expression, getExpressionForComparisonTarget(rhs))) }
    ge(rhs: ComparisonTarget<T>): Predicate { return new Predicate(new ComparisonExpression('>=', this.expression, getExpressionForComparisonTarget(rhs))) }

    //isIn(rhs: SqlSet<T>): Predicate { return new Predicate(new IsInExpression(this.expression, getExpressionForComparisonTarget(rhs))) }
}

export type SqlElement<T> = T & ConcreteSqlElement<T>

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

export type SqlSet<E> = ConcreteSqlSet<E> // | SqlElement<E[]>

export function defineTable<E>(name: string, schema: E): ConcreteSqlSet<{ [P in keyof E]: SqlElement<E[P]> }> {
    var expression = new NamedSetExpression()
    expression.name = name
    return new ConcreteSqlSet(expression, schema)
}

function immediate<T>(value: T): SqlElement<T> { throw null; }

type SqlSetLike<S> = SqlSet<S> | S[]

export function from<S>(source: SqlSetLike<S>): SqlElement<S> {
    if (!(source instanceof ConcreteSqlSet)) source = asSet(source)
    var evaluation = getCurrentEvaluation();
    if (evaluation.expression.from) return joinImpl(source, "CROSS JOIN")
    var fromExpression = evaluation.expression.from = new FromExpression(source.expression)
    var atomicExpression = new AtomicExpression(fromExpression)
    var element = createElement<S>(atomicExpression, source.schema)
    return element
}

export function join<S>(source: SqlSetLike<S>): { on: (condition: (s: SqlElement<S>) => Predicate) => SqlElement<S> } {
    return {
        on: (condition: (s: SqlElement<S>) => Predicate) => joinImpl(source, "JOIN", condition)
    }
}

export function leftJoin<S>(source: SqlSetLike<S>): { on: (condition: (s: SqlElement<S>) => Predicate) => SqlElement<S> } {
    return {
        on: (condition: (s: SqlElement<S>) => Predicate) => joinImpl(source, "LEFT JOIN", condition)
    }
}

export function crossJoin<S>(source: SqlSetLike<S>) { return joinImpl(source, "CROSS JOIN") }
export function crossApply<S>(source: SqlSetLike<S>) { return joinImpl(source, "CROSS APPLY") }
export function outerApply<S>(source: SqlSetLike<S>) { return joinImpl(source, "OUTER APPLY") }

function joinImpl<S>(source: SqlSetLike<S>, kind: string, condition?: (s: SqlElement<S>) => Predicate): SqlElement<S> {
    if (!(source instanceof ConcreteSqlSet)) source = asSet(source)

    var evaluation = getCurrentEvaluation();
    
    var joinExpression = new JoinExpression(source.expression)
    joinExpression.kind = kind
    var atomicExpression = new AtomicExpression(joinExpression)
    var element = createElement<S>(atomicExpression, source.schema)
    joinExpression.on = condition ? condition(element).expression : undefined

    evaluation.expression.joins.push(joinExpression)

    return element            
}

export function where(predicate: Predicate) {
    var evaluation = getCurrentEvaluation();

    if (evaluation.expression.where) throw "Where clause set multiple times."

    evaluation.expression.where = predicate.expression
}

export function having(predicate: Predicate) {
    var evaluation = getCurrentEvaluation();

    if (evaluation.expression.having) throw "Having clause set multiple times."

    evaluation.expression.having = predicate.expression
}

export function not(predicate: Predicate): Predicate {
    return new Predicate(new NotExpression(predicate.expression))
}

export function constant<T>(value: T): SqlElement<T> {
    return createElement(new ConstantExpression(value), value)
}

export function groupBy<T>(key: SqlElement<T>) {
    var evaluation = getCurrentEvaluation();

    if (evaluation.expression.groupby) throw "Group by clause set multiple times."

    evaluation.expression.groupby = key.expression
}

export function orderBy<T>(key: SqlElement<T>) {
    var evaluation = getCurrentEvaluation();

    if (evaluation.expression.orderby) throw "Order by clause set multiple times."

    evaluation.expression.orderby = key.expression
}

export function orderByDesc<T>(key: SqlElement<T>) {
    var evaluation = getCurrentEvaluation();

    if (evaluation.expression.orderby) throw "Order by clause set multiple times."

    evaluation.expression.orderby = key.expression
    evaluation.expression.isOrderByDescending = true
}

export function count(): SqlElement<number> {
    return createElement<number>(new ApplicationExpression(new SqlFunction("COUNT"), [ new ConstantExpression(1) ]), 0)
}

export function trim(text: SqlElement<string>): SqlElement<string> {
    return createElement<string>(new ApplicationExpression(new SqlFunction("TRIM"), [ text.expression ]), '')
}

export function offsetRows(rows: number) {
    var evaluation = getCurrentEvaluation();

    evaluation.expression.offset = rows
}

export function fetchOnly(rows: number) {
    var evaluation = getCurrentEvaluation();

    evaluation.expression.fetchOnly = rows
}

function hasCtor(o: any) {
    return o.__proto__ && o.__proto__.constructor !== Object
}

function getElementExpressionFromElement<T>(e: T): ElementExpression {
    if (e instanceof ConcreteSqlElement)
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
            result.map[p] = getElementExpressionFromElement(v)
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
    <E>(monad: () => SqlElement<E>): SqlSet<E>
    <E>(monad: () => E): SqlSet<E>
}
= <E>(monad: () => E) => {
    evaluationStack.push({ expression: new SelectExpression() })
    try {
        var result = monad()

        var evaluation = getCurrentEvaluation();
        evaluation.expression.select = getElementExpressionFromElement(result)

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
    else if (s instanceof ConcreteSqlElement) {
        return new ConcreteSqlSet(new ElementAsSetExpression(s.expression), new (s as any).elementConstructor())
    }
    else
        throw "Unexpected argument of a from or join function: " + s
}
