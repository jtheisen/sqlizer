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

    joins: JoinExpression[] = []

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
    VisitSelectExpression(expression: SelectExpression) { throw this.NotImplemented }
    VisitSetExpression(expression: SetExpression) {
        if (expression instanceof NamedSetExpression)
            this.VisitNamedExpression(expression)
        else if (expression instanceof QueriedSetExpression)
            this.VisitQueriedExpression(expression)
        else
            throw this.NotImplemented
    }
    VisitQueriedExpression(expression: QueriedSetExpression) { throw this.NotImplemented }
    VisitNamedExpression(expression: NamedSetExpression) { throw this.NotImplemented }
    //VisitImmediateExpression(expression: ImmediateSetExpression) { throw this.NotImplemented }

    VisitScalarExpression(expression: ScalarExpression) {
        if (expression instanceof BindingExpression)
            this.VisitBindingExpression(expression)
        else
            throw this.NotImplemented
    }
    VisitBindingExpression(expression: BindingExpression) {
        if (expression instanceof FromExpression)
            this.VisitFromExpression(expression)
        else if (expression instanceof JoinExpression)
            this.VisitJoinExpression(expression)
        else
            throw this.NotImplemented
    }
    VisitFromExpression(expression: FromExpression) { throw this.NotImplemented }
    VisitJoinExpression(expression: JoinExpression) { throw this.NotImplemented }

    VisitPredicateExpression(expression: PredicateExpression) { throw this.NotImplemented }

    private NotImplemented = "not implemented"
}

interface Run {
    children: (Run | string)[]
    weight?: number
}

function setWeights(run: Run) {
    var weight = 0
    for (var r of run.children) {
        if (typeof(r) === "string")
            weight += r.length
        else {
            setWeights(r)
            if (!r.weight) throw "Something's off"
            weight += r.weight
        }
    }
    run.weight = weight
}

function stringify(run: Run) {
    var parts: string[] = []
    function strigifyImpl(run: Run) {
        for (var r of run.children) {
            if (typeof(r) === "string")
                parts.push(r)
            else {
                strigifyImpl(r)
            }
        }
    }
    strigifyImpl(run)
    return parts.join(" ")
}

class SerializerVisitor extends ExpressionVisitor {
    private stack: Run[] = []

    GetTokenTree(expression: SetExpression) {
        var result: Run | undefined
        this.run(() => {
            this.VisitSetExpression(expression)
            if (!this.stack || this.stack.length !== 1) throw "Something's off"
            result = this.stack[0]
        })
        return result
    }

    VisitSelectExpression(expression: SelectExpression) {
        this.run(() => {
            this.write('SELECT')
            this.VisitFromExpression(expression.from)
        })
        
        this.run(() => {
            for (var join of expression.joins) {
                this.run(() => this.VisitJoinExpression(join))
            }
        })
    }
        
    VisitFromExpression(expression: FromExpression) {
        this.run(() => {
            this.write('FROM')
            this.VisitSetExpression(expression.source)
        })
    }

    VisitJoinExpression(expression: JoinExpression) {
        this.run(() => {
            this.write(expression.kind)
            this.VisitSetExpression(expression.source)
        })
        this.run(() => {
            this.write('ON')
            this.VisitPredicateExpression(expression.on)
        })
    }

    VisitQueriedExpression(expression: QueriedSetExpression) {
        this.write('(')
        this.run(() => {
            this.VisitSelectExpression(expression.definition)
        })
        this.write(')')
    }

    VisitNamedExpression(expression: NamedSetExpression) {
        this.write(expression.name)
    }

    VisitPredicateExpression(expression: PredicateExpression) {
        this.write('bla')
    }

    run(nested: () => void) {
        var previousRun = this.stack[this.stack.length - 1]

        var newRun = { children: [] }

        this.stack.push(newRun)
        try {
            nested()
        }
        finally {
            if (this.stack.pop() !== newRun) throw "Unexpected top frame"
            if (this.stack[this.stack.length - 1] !== previousRun) throw "Unexpected top frame 2"

            if (previousRun)
                previousRun.children.push(newRun)
        }
    }

    write(text: string) {
        var run = this.stack[this.stack.length - 1]
        if (!run) throw "Token has nothing opened to go to"
        run.children.push(text)
    }
}

export function sqlify(source: SetExpression) {
    var visitor = new SerializerVisitor()
    var tokenTree = visitor.GetTokenTree(source)
    if (!tokenTree) throw "Internal error"
    setWeights(tokenTree)
    return stringify(tokenTree)
}
