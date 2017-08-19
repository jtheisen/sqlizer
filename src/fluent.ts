import {
    FromExpression,
    JoinExpression,
    NamedSetExpression,
    ScalarExpression,
    SelectExpression,
    SetExpression,
} from './expression';


class ConcreteScalar<T>
{
    value: T

    constructor(public expression: ScalarExpression) {
    }
}

interface X<T> {
    [P in keyof T]: X<T>    
}

class ScalarFluents<T> {
    value: T;
  

    add(rhs: Scalar<T>): Scalar<T> { throw 0 }
    eq(rhs: Scalar<T>): Predicate { throw 0 }
    // ne(rhs: Scalar<T>): Predicate;
    // lt(rhs: Scalar<T>): Predicate;
    // gt(rhs: Scalar<T>): Predicate;
    // le(rhs: Scalar<T>): Predicate;
    // ge(rhs: Scalar<T>): Predicate;

    // in(rhs: SqlSet<T> | T[]): Predicate;    
}

// The point being that this prohibits unwittingly calling inappropriate functions in query expressions.
//export type Scalar<T> = { [P in keyof T]: Scalar<T[P]> } //& ScalarFluents<T>

type Predicate = Scalar<boolean> & {
    and(rhs: Predicate): Predicate;
    or(rhs: Predicate): Predicate;
}

var SqlTrue: Predicate;


export class SqlSet<E> {
    constructor(public expression: SetExpression) {
    }
}

export function defineTable<E>(name: string): SqlSet<E> {
    var expression = new NamedSetExpression()
    expression.name = name
    return new SqlSet(expression)
}

function immediate<T>(value: T): Scalar<T> { throw null; }


var scalar: {
    <E>(element: E): Scalar<E>,
    <E>(element: Scalar<E>): Scalar<E>,
} = (e: any) => e


export function from<S>(source: SqlSet<S>): Scalar<S> {
    var evaluation = getCurrentEvaluation();
    evaluation.expression.from = new FromExpression()
    evaluation.expression.from.source = getSetExpression(source)
    return new ConcreteScalar<S>(evaluation.expression.from.source) as any as Scalar<S>;
}

export function join<S>(source: SqlSet<S>): { on: (condition: (s: Scalar<S>) => Predicate) => Scalar<S> } {
    return {
        on: (condition: (s: Scalar<S>) => Predicate) => {
            var evaluation = getCurrentEvaluation();
            
                var joinExpression = new JoinExpression()
                joinExpression.source = getSetExpression(source)
                joinExpression.kind = 'join'
                //joinExpression.on = getPredicate(condition)
            
                evaluation.expression.joins.push(joinExpression)
            
                return new ConcreteScalar<S>(joinExpression.source) as any as Scalar<S>                        
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

        return new SqlSet<E>(evaluation.expression)
    }
    finally {
        evaluationStack.pop();
    }
}

function getSetExpression<T>(source: SqlSet<T>): SetExpression {
    return (source as SqlSet<T>).expression
}