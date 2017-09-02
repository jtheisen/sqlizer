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
    ElementAsSetExpression,
    ElementExpression,
    SelectExpression,
    SetExpression,
} from './expression';

function getProxySchemaForArray(elementConstructor: any, expression: any): ProxySchema {
    var result = new ProxySchema()
    result.target = { elementConstructor, expression }
    result.proxyPrototype = ConcreteLonqElement.prototype
    result.process = (proxy: any) => {
    }
    result.getPropertySchema = undefined
    return result
}

function getProxySchemaForObject(expression: ElementExpression, target: any): ProxySchema {
    var result = new ProxySchema()
    result.target = target,
    result.proxyPrototype = ConcreteLonqElement.prototype,
    result.process = (proxy: any) => {
        proxy.expression = expression
    }
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

function createElement<T>(expression: AtomicExpression, target: any): LonqElement<T> {
    var element = createProxy(getProxySchemaForObject(expression, target))
    return element
}


export class ConcreteLonqElement<T> {
    expression: ElementExpression

    eq(rhs: ConcreteLonqElement<T>): Predicate { return new Predicate(new ComparisonExpression('=', this.expression, rhs.expression)) }
    ne(rhs: ConcreteLonqElement<T>): Predicate { return new Predicate(new ComparisonExpression('<>', this.expression, rhs.expression)) }
    lt(rhs: ConcreteLonqElement<T>): Predicate { return new Predicate(new ComparisonExpression('<', this.expression, rhs.expression)) }
    gt(rhs: ConcreteLonqElement<T>): Predicate { return new Predicate(new ComparisonExpression('>', this.expression, rhs.expression)) }
    le(rhs: ConcreteLonqElement<T>): Predicate { return new Predicate(new ComparisonExpression('<=', this.expression, rhs.expression)) }
    ge(rhs: ConcreteLonqElement<T>): Predicate { return new Predicate(new ComparisonExpression('>=', this.expression, rhs.expression)) }

    //isIn(rhs: LonqSet<T>): Predicate { return new Predicate(new IsInExpression(this.expression, rhs.expression)) }
}

export type LonqElement<T> = T & ConcreteLonqElement<T>

class Predicate {

    constructor(public expression: PredicateExpression) { }

    and(rhs: Predicate): Predicate { return new Predicate(new LogicalBinaryExpression('AND', this.expression, rhs.expression)) }
    or(rhs: Predicate): Predicate { throw new Predicate(new LogicalBinaryExpression('OR', this.expression, rhs.expression)) }

}

var SqlTrue: Predicate;

export class ConcreteLonqSet<E> {
    constructor(public expression: SetExpression, public schema: any) { }

    any(): Predicate { return new Predicate(new ExistsExpression(this.expression)) }
}

export type LonqSet<E> = ConcreteLonqSet<E> // | LonqElement<E[]>

export function defineTable<E>(name: string, schema: E): ConcreteLonqSet<{ [P in keyof E]: LonqElement<E[P]> }> {
    var expression = new NamedSetExpression()
    expression.name = name
    return new ConcreteLonqSet(expression, schema)
}

function immediate<T>(value: T): LonqElement<T> { throw null; }

type LonqSetLike<S> = LonqSet<S> | S[]

export function from<S>(source: LonqSetLike<S>): LonqElement<S> {
    if (!(source instanceof ConcreteLonqSet)) source = asSet(source)
    var evaluation = getCurrentEvaluation();
    if (evaluation.expression.from) return joinImpl(source)
    var fromExpression = evaluation.expression.from = new FromExpression(source.expression)
    var atomicExpression = new AtomicExpression(fromExpression)
    var element = createElement<S>(atomicExpression, source.schema)
    return element
}

export function join<S>(source: LonqSetLike<S>): { on: (condition: (s: LonqElement<S>) => Predicate) => LonqElement<S> } {
    return {
        on: (condition: (s: LonqElement<S>) => Predicate) => joinImpl(source, condition)
    }
}

function joinImpl<S>(source: LonqSetLike<S>, condition?: (s: LonqElement<S>) => Predicate): LonqElement<S> {
    if (!(source instanceof ConcreteLonqSet)) source = asSet(source)
        
    var evaluation = getCurrentEvaluation();
    
    var joinExpression = new JoinExpression(source.expression)
    joinExpression.kind = condition ? 'JOIN' : 'CROSS JOIN'
    var atomicExpression = new AtomicExpression(joinExpression)
    var element = createElement<S>(atomicExpression, source.schema)
    joinExpression.on = condition ? condition(element).expression : undefined

    evaluation.expression.joins.push(joinExpression)

    return element            
}

function hasCtor(o: any) {
    return o.__proto__ && o.__proto__.constructor !== Object
}

function getElementExpressionFromElement<T>(e: T): ElementExpression {
    if (e instanceof ConcreteLonqElement)
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
    <E>(monad: () => LonqElement<E>): LonqSet<E>
    <E>(monad: () => E): LonqSet<E>
}
= <E>(monad: () => LonqElement<E>) => {
    evaluationStack.push({ expression: new SelectExpression() })
    try {
        var result = monad()

        var evaluation = getCurrentEvaluation();
        evaluation.expression.select = getElementExpressionFromElement(result)

        var setExpression = new QueriedSetExpression()
        setExpression.definition = evaluation.expression

        return new ConcreteLonqSet<E>(setExpression, result)
    }
    finally {
        evaluationStack.pop();
    }
}

export function asSet<E>(s: LonqSetLike<E>): ConcreteLonqSet<E> {
    if (s instanceof ConcreteLonqSet)
        return s as any as ConcreteLonqSet<E>
    else if (s instanceof ConcreteLonqElement) {
        return new ConcreteLonqSet(new ElementAsSetExpression(s.expression), new (s as any).elementConstructor())
    }
    else
        throw "Unexpected argument of a from or join function: " + s
}
