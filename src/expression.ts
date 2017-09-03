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

export class ElementAsSetExpression extends SetExpression {
    constructor(public element: ElementExpression) { super() }
}

// query/subquery
export class SelectExpression {
    from: FromExpression

    joins: JoinExpression[] = []

    where?: PredicateExpression

    groupby?: ElementExpression

    having?: PredicateExpression

    orderby?: ElementExpression
    isOrderByDescending = false

    select: ElementExpression

    distinct: boolean = false

    offset?: number
    fetchOnly?: number
}

export class BindingExpression {
    constructor(public source: SetExpression) { }
}

export class FromExpression extends BindingExpression {
}

export class JoinExpression extends BindingExpression {
    kind: string
    on?: PredicateExpression
}

// Functions: FUN '(' [MODIFIERS] PARAMS ')' [ 'WITHIN GROUP' ( 'ORDER BY' ... ) ] [ 'OVER' ( [PARTITION], [ORDER], [ROWSRANGE] ) ]
// CONVERT, CAST, PARSE

export class GroupbyExpression {
    operands: ElementExpression[]
}

export class OrderByExpression {
    operands: ElementExpression
}

export class ElementExpression {
}

// a single value expressed by a subquery
export class ElementSubqueryExpression extends ElementExpression {
    // the subquery must have only one item in its select list
    // and only one item in its result set
    subquery: SelectExpression
}

export class SqlFunction {
    constructor(public name: string) { }
}

export class ApplicationExpression extends ElementExpression {
    constructor(
        public operator: SqlFunction,
        public operands: ElementExpression[]
    ) { super() }
}

export class AtomicExpression extends ElementExpression {
    constructor(public binding: BindingExpression) {
        super()
    }
}

export class MemberExpression extends ElementExpression {
    constructor(
        public parent: ElementExpression,
        public member: string
    ) { super() }
}

export class ObjectExpression extends ElementExpression {
    constructor(
        public keys: string[],
        public map: { [key: string]: ElementExpression }
    ) { super() }
}

export class ConstantExpression extends ElementExpression {
    constructor(
        public value: any
    ) { super() }
}

export class PredicateExpression {
}

export class ComparisonExpression extends PredicateExpression {
    constructor(

        public operator: string,

        public lhs: ElementExpression,
        public rhs: ElementExpression
        
    ) { super() }
}

export class IsNullOrNotExpression extends PredicateExpression {
    constructor(

        public operand: ElementExpression,
        public isNull: boolean = true

    ) { super() }
}

export class IsInExpression extends PredicateExpression {
    constructor(

        public lhs: ElementExpression,
        public rhs: SetExpression

    ) { super() }
}

export class ExistsExpression extends PredicateExpression {
    constructor(

        public operand: SetExpression

    ) { super() }
}

export class LogicalBinaryExpression extends PredicateExpression {
    constructor(

        public operator: string,
        
        public lhs: PredicateExpression,
        public rhs: PredicateExpression
        
    ) { super() }
}

export class NotExpression extends PredicateExpression {
    constructor(
        public operand: PredicateExpression
    ) { super() }
}


class ExpressionVisitor {
    visitSelectExpression(expression: SelectExpression) {
        this.visitElementExpression(expression.select)
        this.visitFromExpression(expression.from)
        for (var join of expression.joins)
            this.visitJoinExpression(join)

        if (expression.where)
            this.visitPredicateExpression(expression.where)

        if (expression.groupby)
            this.visitElementExpression(expression.groupby)

        if (expression.having)
            this.visitPredicateExpression(expression.having)

        if (expression.orderby)
            this.visitElementExpression(expression.orderby)
    }
    visitSetExpression(expression: SetExpression) {
        if (expression instanceof NamedSetExpression)
            this.visitNamedExpression(expression)
        else if (expression instanceof QueriedSetExpression)
            this.visitQueriedExpression(expression)
        else if (expression instanceof ElementAsSetExpression)
            this.visitElementAsSetExpression(expression)
        else
            this.unconsidered()
    }
    visitQueriedExpression(expression: QueriedSetExpression) {
        this.visitSelectExpression(expression.definition)
    }
    visitNamedExpression(expression: NamedSetExpression) { }
    //visitImmediateExpression(expression: ImmediateSetExpression) { this.unconsidered() }
    visitElementAsSetExpression(expression: ElementAsSetExpression) {
        this.visitElementExpression(expression.element)
    }

    visitBindingExpression(expression: BindingExpression) {
        if (expression instanceof FromExpression)
            this.visitFromExpression(expression)
        else if (expression instanceof JoinExpression)
            this.visitJoinExpression(expression)
        else
            this.unconsidered()
    }
    visitFromExpression(expression: FromExpression) {
        this.visitSetExpression(expression.source)
    }
    visitJoinExpression(expression: JoinExpression) {
        this.visitSetExpression(expression.source)
        if (expression.on) this.visitPredicateExpression(expression.on)
    }

    visitElementExpression(expression: ElementExpression) {
        if (expression instanceof ElementSubqueryExpression)
            this.visitElementSubqueryExpression(expression)
        else if (expression instanceof AtomicExpression)
            this.visitAtomicExpression(expression)
        else if (expression instanceof ApplicationExpression)
            this.visitApplicationExpression(expression)
        else if (expression instanceof MemberExpression)
            this.visitMemberExpression(expression)
        else if (expression instanceof ObjectExpression)
            this.visitObjectExpression(expression)
        else if (expression instanceof ConstantExpression)
            this.visitConstantExpression(expression)
        else
            this.unconsidered()
    }
    visitElementSubqueryExpression(expression: ElementSubqueryExpression) {
        this.visitSelectExpression(expression.subquery)
    }
    visitAtomicExpression(expression: AtomicExpression) {
    }
    visitApplicationExpression(expression: ApplicationExpression) {
        for (var operand of expression.operands)
            this.visitElementExpression(operand)
    }
    visitMemberExpression(expression: MemberExpression) {
        this.visitElementExpression(expression.parent)
    }
    visitObjectExpression(expression: ObjectExpression) {
        for (var key of expression.keys)
            this.visitElementExpression(expression.map[key])
    }
    visitConstantExpression(expression: ConstantExpression) { }

    visitPredicateExpression(expression: PredicateExpression) {
        if (expression instanceof ComparisonExpression)
            this.visitComparisonExpression(expression)
        else if (expression instanceof LogicalBinaryExpression)
            this.visitLogicalBinaryExpression(expression)
        else if (expression instanceof NotExpression)
            this.visitNotExpression(expression)
        else if (expression instanceof IsNullOrNotExpression)
            this.visitIsNullOrNotExpression(expression)
        else if (expression instanceof IsInExpression)
            this.visitIsInExpression(expression)
        else if (expression instanceof ExistsExpression)
            this.visitExistsExpression(expression)
        else
            this.unconsidered()
    }
    visitComparisonExpression(expression: ComparisonExpression) {
        this.visitElementExpression(expression.lhs)
        this.visitElementExpression(expression.rhs)
    }
    visitLogicalBinaryExpression(expression: LogicalBinaryExpression) {
        this.visitPredicateExpression(expression.lhs)
        this.visitPredicateExpression(expression.rhs)
    }
    visitNotExpression(expression: NotExpression) {
        this.visitPredicateExpression(expression.operand)
    }
    visitIsNullOrNotExpression(expression: IsNullOrNotExpression) {
        this.visitElementExpression(expression.operand)
    }
    visitIsInExpression(expression: IsInExpression) {
        this.visitElementExpression(expression.lhs)
        this.visitSetExpression(expression.rhs)
    }
    visitExistsExpression(expression: ExistsExpression) {
        this.visitSetExpression(expression.operand)
    }

    unconsidered() { }
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
        else if (r.children.length) {
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

class BindingCollectorVisitor extends ExpressionVisitor {
    private bindingExpressions: BindingExpression[] = []

    static getBindings(expression: SetExpression) {
        var self = new BindingCollectorVisitor()
        self.visitSetExpression(expression)
        return self.bindingExpressions
    }

    visitFromExpression(expression: FromExpression) {
        this.bindingExpressions.push(expression)
        super.visitFromExpression(expression)
    }

    visitJoinExpression(expression: JoinExpression) {
        this.bindingExpressions.push(expression)
        super.visitFromExpression(expression)
    }
}
var collectBindings = BindingCollectorVisitor.getBindings

function createIdentifiers(bindings: BindingExpression[]) {

    function suggestIdentifier(bindingExpression: BindingExpression) {
        var setExpression = bindingExpression.source
        if (setExpression instanceof NamedSetExpression) {
            return setExpression.name
        } else if(setExpression instanceof QueriedSetExpression) {
            return 'subquery'
        } else {
            return 'set'
        }
    }

    var identifiersNeedingQualification = new Map<string, number>()

    var madeIdentifiers = new Set<string>()

    for (var binding of bindings) {
        var suggestion = suggestIdentifier(binding)
        if (madeIdentifiers.has(suggestion) && !identifiersNeedingQualification.has(suggestion)) {
            identifiersNeedingQualification.set(suggestion, 0)
        }
    }

    var identifiers = new Map<BindingExpression, string>()

    for (var binding of bindings) {
        var suggestion = suggestIdentifier(binding)
        var count = identifiersNeedingQualification.get(suggestion)
        if (typeof count === 'undefined') {
            identifiers.set(binding, suggestion)
        } else {
            identifiers.set(binding, suggestion + count)
            identifiersNeedingQualification.set(suggestion, count + 1)
        }
    }

    return identifiers
}

class SerializerVisitor extends ExpressionVisitor {
    private stack: Run[] = []

    constructor(private identifiers: Map<BindingExpression, string>) {
        super()
    }

    GetTokenTree(expression: SetExpression) {
        var result: Run | undefined
        this.run(() => {
            this.visitSetExpression(expression)
            if (!this.stack || this.stack.length !== 1) throw "Something's off"
            result = this.stack[0]
        })
        return result
    }

    

    visitSelectExpression(expression: SelectExpression) {
        this.run(() => {
            this.write('SELECT')
            if (expression.distinct)
                this.write('DISTINCT')
            this.visitElementExpression(expression.select)
        })
        
        this.run(() => {
            this.visitFromExpression(expression.from)
            for (var join of expression.joins) {
                this.run(() => this.visitJoinExpression(join))
            }
        })

        if (expression.where) {
            this.write('WHERE')
            this.visitPredicateExpression(expression.where)
        }

        if (expression.groupby) {
            this.write('GROUP BY')
            this.visitElementExpression(expression.groupby)
        }

        if (expression.having) {
            this.write('HAVING')
            this.visitPredicateExpression(expression.having)
        }

        if (expression.orderby) {
            this.write('ORDER BY')
            this.visitElementExpression(expression.orderby)
            if (expression.isOrderByDescending)
                this.write('DESC')
        }

        if (expression.offset) {
            this.write('OFFSET')
            this.write(expression.offset.toString())
            this.write('ROWS')
        }
        if (expression.offset) {
            this.write('FETCH')
            this.write(expression.offset.toString())
            this.write('ROWS ONLY')
        }
    }

    visitFromExpression(expression: FromExpression) {
        this.run(() => {
            this.write('FROM')
            this.visitSetExpression(expression.source)
            var identifier = this.identifiers ? this.identifiers.get(expression) : undefined
            this.write(identifier ? identifier : '*')
        })
    }
    visitJoinExpression(expression: JoinExpression) {
        this.run(() => {
            this.write(expression.kind)
            this.visitSetExpression(expression.source)
            var identifier = this.identifiers ? this.identifiers.get(expression) : undefined
            this.write(identifier ? identifier : '*')
        })
        if (expression.on) {
            let expressionOn = expression.on
            this.run(() => {
                this.write('ON')
                this.visitPredicateExpression(expressionOn)
            })
        }
    }

    visitQueriedExpression(expression: QueriedSetExpression) {
        this.write('(')
        this.run(() => {
            this.visitSelectExpression(expression.definition)
        })
        this.write(')')
    }

    visitNamedExpression(expression: NamedSetExpression) {
        this.write(expression.name)
    }

    visitComparisonExpression(expression: ComparisonExpression) {        
        this.visitElementExpression(expression.lhs)
        this.write(expression.operator)
        this.visitElementExpression(expression.rhs)
    }
    visitLogicalBinaryExpression(expression: LogicalBinaryExpression) {
        this.visitPredicateExpression(expression.lhs)
        this.write(expression.operator)
        this.visitPredicateExpression(expression.rhs)
    }
    visitNotExpression(expression: NotExpression) {
        this.write('NOT')
        this.visitPredicateExpression(expression.operand)
    }
    visitIsNullOrNotExpression(expression: IsNullOrNotExpression) {
        this.visitElementExpression(expression.operand)
        this.write(expression.isNull ? 'IS NULL' : 'IS NOT NULL')
    }
    visitIsInExpression(expression: IsInExpression) {
        this.visitElementExpression(expression.lhs)
        this.visitSetExpression(expression.rhs)
    }
    visitExistsExpression(expression: ExistsExpression) {
        this.visitSetExpression(expression.operand)
    }

    // Elements

    visitAtomicExpression(expression: AtomicExpression) {
        var identifier = this.identifiers.get(expression.binding)
        if (!identifier) throw "Unexpectedly missing identifier."
        this.write(identifier)
    }
    visitApplicationExpression(expression: ApplicationExpression) {
        this.write(expression.operator.name)
        this.write('(')
        this.run(() => {
            var hadFirst = false
            for (var op of expression.operands) {
                if (hadFirst) this.write(',')
                this.visitElementExpression(op)
                hadFirst = true
            }
            this.write(')')
        })
    }
    visitElementSubqueryExpression(expression: ElementSubqueryExpression) {
        this.write('(')
        this.visitSelectExpression(expression.subquery)
        this.write(')')
    }
    visitMemberExpression(expression: MemberExpression) {
        this.visitElementExpression(expression.parent)
        this.write('.')
        this.write(expression.member)
    }
    visitObjectExpression(expression: ObjectExpression) {
        this.write('{')
        var hadFirst = false
        for (var key of expression.keys) {
            if (hadFirst) this.write(',')
            hadFirst = true
            this.write(key)
            this.write(':')
            this.visitElementExpression(expression.map[key])
        }
        this.write('}')
    }
    visitConstantExpression(expression: ConstantExpression) {
        var value = expression.value
        var type = typeof(value)
        if (type === 'boolean')
            this.write(value ? 'TRUE' : 'FALSE')
        else if (type === 'number')
            this.write(value.toString())
        else if (type === 'string')
            this.write(value)
        else
            throw "Type is unsupported for constant"
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
    var bindings = collectBindings(source)
    var identifiers = createIdentifiers(bindings)
    var visitor = new SerializerVisitor(identifiers)
    var tokenTree = visitor.GetTokenTree(source)
    if (!tokenTree) throw "Internal error"
    setWeights(tokenTree)
    return stringify(tokenTree)
}
