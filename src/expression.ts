// aliased set/view/cte or query/subquery
export class AliasedSetExpression {
    set: SetExpression
}

// table/view/cte
export class SetExpression {
}

export class QueriedSetExpression extends SetExpression {
    definition: SelectExpression
}

export class NamedSetExpression extends SetExpression {
    name: string
}

export class ImmediateSetExpression extends SetExpression {
    values: any[]
}

// query/subquery
export class SelectExpression {
    from: AliasedSetExpression

    joins: JoinExpression[]

    where: PredicateExpression

    groupby: GroupbyExpression

    having: PredicateExpression

    orderby: OrderByExpression

    select: ScalarExpression

    distinct: boolean
}

// Functions: FUN '(' [MODIFIERS] PARAMS ')' [ 'WITHIN GROUP' ( 'ORDER BY' ... ) ] [ 'OVER' ( [PARTITION], [ORDER], [ROWSRANGE] ) ]
// CONVERT, CAST, PARSE

export class GroupbyExpression {
    operands: ScalarExpression[]
}

export class OrderByExpression {
    operands: ScalarExpression
}

export class ScalarExpression {
}

export class IsNullOrNotExpression {

    operand: ScalarExpression
}

// a single value expressed by a subquery
export class ScalarSubqueryExpression extends ScalarExpression {
    // the subquery must have only one item in its select list
    // and only one item in its result set
    subquery: SelectExpression
}

export class SqlFunction {
    constructor(public name: string) { }
}

export class ApplicationExpression extends ScalarExpression {
    operator: SqlFunction

    operands: ScalarExpression[]
}

export class BindingExpression extends ScalarExpression {
    source: SetExpression
}

export class FromExpression extends BindingExpression {
}

export class JoinExpression extends BindingExpression {
    kind: string
    on: PredicateExpression
}

export class PredicateExpression {
}

export class ComparisonExpression extends PredicateExpression {
    operator: string

    lhs: ScalarExpression
    rhs: ScalarExpression
}

export class LogicalBinaryExpression extends PredicateExpression {
    operator: string

    lhs: PredicateExpression
    rhs: PredicateExpression
}

export class NotExpression extends PredicateExpression {
    operand: PredicateExpression
}
