import {
    FromExpression,
    JoinExpression,
    NamedSetExpression,
    QueriedSetExpression,
    ScalarExpression,
    SelectExpression,
    SetExpression,
} from './expression';



class ConcreteScalar<T> {
    constructor(public set: SetExpression) {

    }

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
//export type Scalar<T> = { [P in keyof T]: Scalar<T[P]> } & ConcreteScalar<T>

export type ScalarN<T> = { [P in keyof T]: ScalarN<T[P]> } & ConcreteScalar<T>
export type Scalar4<T> = { [P in keyof T]: ScalarN<T[P]> } & ConcreteScalar<T>
export type Scalar3<T> = { [P in keyof T]: Scalar4<T[P]> } & ConcreteScalar<T>
export type Scalar2<T> = { [P in keyof T]: Scalar3<T[P]> } & ConcreteScalar<T>
export type Scalar1<T> = { [P in keyof T]: Scalar2<T[P]> } & ConcreteScalar<T>
export type Scalar<T> = { [P in keyof T]: Scalar1<T[P]> } & ConcreteScalar<T>

class Predicate {
    and(rhs: Predicate): Predicate { throw 0 }
    or(rhs: Predicate): Predicate { throw 0 }
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

        var setExpression = new QueriedSetExpression()
        setExpression.definition = evaluation.expression

        return new SqlSet<E>(setExpression)
    }
    finally {
        evaluationStack.pop();
    }
}

function getSetExpression<T>(source: SqlSet<T>): SetExpression {
    return (source as SqlSet<T>).expression
}