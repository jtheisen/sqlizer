

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
    alias: string

    set: SetExpression
}

// table/view/cte
class SetExpression {
    name: string

    fields: string[] // column aliases
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

    select: ScalarExpression[]
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

interface SqlSet<E> {
    //dontuse: E // why is this necessary?

    where(p: (e: Scalar<E>) => Predicate): SqlSet<E>;

    map<T>(f: (e: Scalar<E>) => Scalar<T>): SqlSet<T>;

    join<E2>(s2: SqlSet<E2>): JoinStep2<E, E2>;

    group<T>(f: (e: E) => T): GroupStep<E, T>;
    // shortcut
    groupby<K>(p: (e: E) => K): SqlSet<Grouping<E, K>>;
}

interface GroupStep<E, T> {
    by<K>(p: (e: E) => K): SqlSet<Grouping<E, K>>
}

interface Grouping<G, K> extends SqlSet<G> {
    key: K;
}

interface JoinStep2<E, E2> {
    on(c: (e: E, e2: E2) => boolean): JoinStep3<E, E2>;
}

interface JoinStep3<E, E2> {
    map<T>(f: (e: E, e2: E2) => T) : SqlSet<T>;
}

function from<E>(entity: E): SqlSet<E> { throw null; }

function map<E, T>(source: SqlSet<E>, f: (e: E) => T): SqlSet<T> {
    throw null;
}

function immediate<T>(value: T): Scalar<T> { throw null; }

var myEntities: SqlSet<Entity>;
var myCities: SqlSet<City>;

var myEntity = new Entity();

var x = myEntities.where(e => e.age.eq(immediate(32))).join(myCities).on((e, c) => e.name == c.name).map((e, e2) => e.age + e2.name);
var y = myEntities.where(e => SqlTrue
    .and(e.eq(e))
    .and(e.eq(e))
    .and(e.in(myEntities)
        .and(e.in([myEntity]))));


