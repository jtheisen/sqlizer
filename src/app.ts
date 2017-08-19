
/*

We do *only* the monadic version at first. This is in fact easier (as the monadic expressions reflect
complete sql query units) and it's what I seek to prove possible anyway.

We now have two sets of types so far:
- Typed Scalar/SqlSet for fluid syntax and
- Untyped Expressions representing an intermediate form of the query

The expression already shows the structure the query will have (the number of subqueries, for example).
It does not yet, however, contain the following:
- There are no aliases in the expressions. Those will be given in the final render step.
- Implicit joins necessitated through accessing a scalar navigational property.
- Implicit applies?

*/



class Entity {
    name: string
    age = 32
    city: City
}

class City {
    name: string
}

// aliased set/view/cte or query/subquery
class AliasedSetExpression {
    set: SetExpression
}

// table/view/cte
class SetExpression {
}

class QueriedSetExpression extends SetExpression {
    definition: SelectExpression
}

class NamedSetExpression extends SetExpression {
    name: string
}

// problem: (VALUES (1), (2)) x (y) - the table alias is 'x' is
// a part of the expression and it comes before the column aliases
class ImmediateSetExpression extends SetExpression {
    values: any[]
}

// query/subquery
class SelectExpression {
    from: AliasedSetExpression

    joins: JoinExpression[]

    where: PredicateExpression

    groupby: GroupbyExpression

    having: PredicateExpression

    orderby: OrderByExpression

    select: ScalarExpression

    distinct: boolean
}

class JoinExpression {
    kind: string

    source: AliasedSetExpression

    on: PredicateExpression
}

// Functions: FUN '(' [MODIFIERS] PARAMS ')' [ 'WITHIN GROUP' ( 'ORDER BY' ... ) ] [ 'OVER' ( [PARTITION], [ORDER], [ROWSRANGE] ) ]
// CONVERT, CAST, PARSE

class GroupbyExpression {
    operands: ScalarExpression[]
}

class OrderByExpression {
    operands: ScalarExpression
}

class ScalarExpression {
}

class IsNullOrNotExpression {

    operand: ScalarExpression
}

// a single value expressed by a subquery
class ScalarSubqueryExpression extends ScalarExpression {
    // the subquery must have only one item in its select list
    // and only one item in its result set
    subquery: SelectExpression
}

class SqlFunction {
    constructor(public name: string) { }
}

class ApplicationExpression extends ScalarExpression {
    operator: SqlFunction

    operands: ScalarExpression[]
}

class AtomExpression extends ScalarExpression {
    select: SetExpression

    field: string
}

class PredicateExpression {
}

class ComparisonExpression extends PredicateExpression {
    operator: string

    lhs: ScalarExpression
    rhs: ScalarExpression
}

class LogicalBinaryExpression extends PredicateExpression {
    operator: string

    lhs: PredicateExpression
    rhs: PredicateExpression
}

class NotExpression extends PredicateExpression {
    operand: PredicateExpression
}

class ConcreteScalar<T>
{
    value: T

    constructor() {
    }
}


// The point being that this prohibits unwittingly calling inappropriate functions in query expressions.
type Scalar<T> = {
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


class SqlSet<E> {
    //dontuse: E // why is this necessary?

    join<E2>(s2: SqlSet<E2>): JoinStep2<E, E2>
    {

    }
    
    where(p: (e: Scalar<E>) => Predicate): SqlSet<E>
    {

    }

    // map<T>(f: (e: Scalar<E>) => Scalar<T>): SqlSet<T>;

    // group<T>(f: (e: E) => T): GroupStep<E, T>;
    // // shortcut
    // groupby<K>(p: (e: E) => K): SqlSet<Grouping<E, K>>;
}

class ConcreteSqlSet<E> extends SqlSet<E> {
}


interface GroupStep<E, T> {
    by<K>(p: (e: E) => K): SqlSet<Grouping<E, K>>
}

interface Grouping<G, K> extends SqlSet<G> {
    key: K;
}

class JoinStep2<E, E2> {

    constructor(private s2: SqlSet<E2>) { }

    on(c: (e: E, e2: E2) => boolean): SqlSet<[E, E2]>
    {
        
    }
}

//function from<E>(entity: E): SqlSet<E> { throw null; }

function map<E, T>(source: SqlSet<E>, f: (e: E) => T): SqlSet<T> {
    throw null;
}

function immediate<T>(value: T): Scalar<T> { throw null; }

var myEntities: SqlSet<Entity>;
var myCities: SqlSet<City>;

var myEntity = new Entity();



var evaluationStack: {
    expression: SelectExpression
}[] = [];

function getCurrentEvaluation() {
    return evaluationStack[evaluationStack.length - 1]
}

var query: {
    <E>(monad: () => Scalar<E>): SqlSet<E>
    <E>(monad: () => E): SqlSet<E>
}
= <E>(monad: () => Scalar<E>) => {
    evaluationStack.push({ expression: new SelectExpression() })
    try {
        var result = monad()

        var evaluation = getCurrentEvaluation();

        return new ConcreteSqlSet<E>()
    }
    finally {
        evaluationStack.pop();
    }
}

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


function from<S>(source: SqlSet<S>) {
    var evaluation = getCurrentEvaluation();
    evaluation.expression.from = makeAliasedSetExpression(source)
    return new ConcreteScalar<S>() as Scalar<S>;
}

function join<S>(source: SqlSet<S>, condition: (s: Scalar<S>) => Predicate): Scalar<S>
{
    var evaluation = getCurrentEvaluation();

    var joinExpression = new JoinExpression()
    joinExpression.source = makeAliasedSetExpression(source)
    joinExpression.kind = 'join'
    //joinExpression.on = getPredicate(condition)

    evaluation.expression.joins.push(joinExpression)

    return new ConcreteScalar<S>() as Scalar<S>
}


var myQuery = query(() =>
{
    var x = from(myEntities);
    var y = join(myCities, c => x.city.name.eq(c.name));

    var p = { e: x, c: y }

    return p;
})
