import { AliasedSetExpression, JoinExpression, ScalarExpression, SelectExpression, SetExpression } from './expression';


class ConcreteScalar<T>
{
    value: T

    constructor(public expression: ScalarExpression) {
    }
}

// The point being that this prohibits unwittingly calling inappropriate functions in query expressions.
export type Scalar<T> = {
    [P in keyof T]: Scalar<T[P]>;
} & {
        value: T;

        add(rhs: Scalar<T>): Scalar<T>;
        eq(rhs: Scalar<T>): Predicate;
        ne(rhs: Scalar<T>): Predicate;
        lt(rhs: Scalar<T>): Predicate;
        gt(rhs: Scalar<T>): Predicate;
        le(rhs: Scalar<T>): Predicate;
        ge(rhs: Scalar<T>): Predicate;

        in(rhs: SqlSet<T> | T[]): Predicate;
    }

type Predicate = Scalar<boolean> & {
    and(rhs: Predicate): Predicate;
    or(rhs: Predicate): Predicate;
}

var SqlTrue: Predicate;


export class SqlSet<E> {
}

class ConcreteSqlSet<E> extends SqlSet<E> {
    constructor(public expression: SetExpression) {
        super()
    }
}

function immediate<T>(value: T): Scalar<T> { throw null; }



declare function scalar<E>(element: E): Scalar<E>;
declare function scalar<E>(element: Scalar<E>): Scalar<E>;

var x = scalar

// function scalar<E>(element: E): Scalar<E> {
//     return element as any as Scalar<E>
// }




function makeAliasedSetExpression<T>(source: SqlSet<T>) {
    var aliased = new AliasedSetExpression();
    aliased.set = getSetExpression(source)
    return aliased
}


export function from<S>(source: SqlSet<S>) {
    var evaluation = getCurrentEvaluation();
    evaluation.expression.from = makeAliasedSetExpression(source)
    return new ConcreteScalar<S>(getSetExpression(source)) as any as Scalar<S>;
}

export function join<S>(source: SqlSet<S>, condition: (s: Scalar<S>) => Predicate): Scalar<S>
{
    var evaluation = getCurrentEvaluation();

    var joinExpression = new JoinExpression()
    joinExpression.source = makeAliasedSetExpression(source)
    joinExpression.kind = 'join'
    //joinExpression.on = getPredicate(condition)

    evaluation.expression.joins.push(joinExpression)

    return new ConcreteScalar<S>(getSetExpression(source)) as any as Scalar<S>
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

        return new ConcreteSqlSet<E>(evaluation.expression)
    }
    finally {
        evaluationStack.pop();
    }
}

function getSetExpression<T>(source: SqlSet<T>): SetExpression {
    return (source as ConcreteSqlSet<T>).expression
}