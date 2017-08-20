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

interface Wrap {
    lead: string[]
    run: Run | null
    trail: string[]
}

interface Run {
    wraps: Wrap[]
}

interface Frame {
    run: Run
    wrap: Wrap | null // this wrap is in the former run
    tokens: string[] | null // these tokens are in the former wrap
}

class SerializerVisitor extends ExpressionVisitor {
    private stack: Frame[] = []

   VisitSelectExpression(expression: SelectExpression) {
        this.wrap(() => {
            this.write('SELECT')
            this.VisitFromExpression(expression.from)
        
            this.run(() => {
                for (var join of expression.joins) {
                    this.wrap(() => this.VisitJoinExpression(join))
                }
            })
        })
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

    VisitQueriedExpression(expression: QueriedSetExpression) {
        this.write('(')
        this.VisitSelectExpression(expression.definition)
        this.write(')')
    }

    VisitNamedExpression(expression: NamedSetExpression) {
        this.write(expression.name)
    }

    VisitPredicateExpression(expression: PredicateExpression) {
        this.write('bla')
    }

    run(nested: () => void) {
        var topFrame = this.stack[this.stack.length - 1]

        if (topFrame.run) throw "Cant open run while at a trail"

        this.stack.push({
            run: { wraps: [] },
            wrap: null,
            tokens: null
        })
        try {
            nested()
        }
        finally {
            var frame = this.stack.pop()
            if (!frame) throw "Unexpected end of stack"
            if (this.stack[this.stack.length - 1] !== topFrame) throw "Unexpected top frame"
            if (!topFrame.wrap) throw "Frame returned to from a run had no open wrap."
            topFrame.wrap.run = frame.run
            topFrame.tokens = topFrame.wrap.trail
        }
    }

    wrap(nested: () => void) {
        var topFrame = this.stack[this.stack.length - 1]

        if (topFrame.wrap) throw "Cannot open wrap within a wrap"
            
        var newWrap = {
            lead: [],
            run: null,
            trail: []
        }
        topFrame.run.wraps.push(newWrap)
        topFrame.wrap = newWrap
        topFrame.tokens = newWrap.lead
        
        try {
            nested()
        }
        finally {
            if (this.stack[this.stack.length - 1] !== topFrame) throw "Unexpected top frame"

            topFrame.wrap = null
            topFrame.tokens = null
        }
    }

    write(text: string) {
        var topFrame = this.stack[this.stack.length - 1]
        if (!topFrame || !topFrame.tokens) throw "Token has nothing opened to go to"
        topFrame.tokens.push(text)
    }
}

export function sqlify(source: SetExpression) {
    var visitor = new PrintVisitor()
    visitor.VisitSetExpression(source)
}