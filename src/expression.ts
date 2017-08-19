// aliased set/view/cte or query/subquery
// export class AliasedSetExpression {
//     set: SetExpression
// }

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
    from: FromExpression

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


class ExpressionVisitor {
    VisitSetExpression(expression: SetExpression) {
        if (expression instanceof NamedSetExpression)
            this.VisitNamedExpression(expression)
        else if (expression instanceof QueriedSetExpression)
            this.VisitQueriesExpression(expression)
        else
            this.notimplemented()
    }
    VisitNamedExpression(expression: NamedSetExpression) { this.notimplemented() }
    //VisitImmediateExpression(expression: ImmediateSetExpression) { this.notimplemented() }
    VisitQueriesExpression(expression: QueriedSetExpression) { this.notimplemented() }

    VisitScalarExpression(expression: ScalarExpression) {
        if (expression instanceof BindingExpression)
            this.VisitBindingExpression(expression)
        else
            this.notimplemented()
    }
    VisitBindingExpression(expression: BindingExpression) {
        if (expression instanceof FromExpression)
            this.VisitFromExpression(expression)
        else if (expression instanceof JoinExpression)
            this.VisitJoinExpression(expression)
        else
            this.notimplemented()
    }
    VisitFromExpression(expression: FromExpression) { this.notimplemented() }
    VisitJoinExpression(expression: JoinExpression) { this.notimplemented() }

    VisitPredicateExpression(expression: PredicateExpression) { this.notimplemented() }
    VisitSelectExpression(expression: SelectExpression) { this.notimplemented() }
    
    private notimplemented() { throw "not implemented" }
}

class PrintVisitor extends ExpressionVisitor {
    VisitSelectExpression(expression: SelectExpression) {
        this.write('SELECT')
        this.VisitFromExpression(expression.from)
        for (var join of expression.joins)
            this.VisitJoinExpression(join)
    }

    VisitFromExpression(expression: FromExpression) {
        this.write('FROM')
        this.VisitSetExpression(expression.source)
    }

    VisitJoinExpression(expression: JoinExpression) {
        this.write(expression.kind)
        this.VisitSetExpression(expression.source)
        this.write('ON')
        this.VisitPredicateExpression(expression.on)
    }

    VisitPredicateExpression(expression: PredicateExpression) {
        this.write('bla')
    }

    write(text: string) {
        console.info(text)
    }
}

function sqlize(source: SetExpression) {
    var visitor = new PrintVisitor()
    visitor.VisitSetExpression(source)
}