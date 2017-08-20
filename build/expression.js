"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SetExpression {
}
exports.SetExpression = SetExpression;
class QueriedSetExpression extends SetExpression {
}
exports.QueriedSetExpression = QueriedSetExpression;
class NamedSetExpression extends SetExpression {
}
exports.NamedSetExpression = NamedSetExpression;
class ImmediateSetExpression extends SetExpression {
}
exports.ImmediateSetExpression = ImmediateSetExpression;
class SelectExpression {
    constructor() {
        this.joins = [];
    }
}
exports.SelectExpression = SelectExpression;
class GroupbyExpression {
}
exports.GroupbyExpression = GroupbyExpression;
class OrderByExpression {
}
exports.OrderByExpression = OrderByExpression;
class ScalarExpression {
}
exports.ScalarExpression = ScalarExpression;
class IsNullOrNotExpression {
}
exports.IsNullOrNotExpression = IsNullOrNotExpression;
class ScalarSubqueryExpression extends ScalarExpression {
}
exports.ScalarSubqueryExpression = ScalarSubqueryExpression;
class SqlFunction {
    constructor(name) {
        this.name = name;
    }
}
exports.SqlFunction = SqlFunction;
class ApplicationExpression extends ScalarExpression {
}
exports.ApplicationExpression = ApplicationExpression;
class BindingExpression extends ScalarExpression {
}
exports.BindingExpression = BindingExpression;
class FromExpression extends BindingExpression {
}
exports.FromExpression = FromExpression;
class JoinExpression extends BindingExpression {
}
exports.JoinExpression = JoinExpression;
class PredicateExpression {
}
exports.PredicateExpression = PredicateExpression;
class ComparisonExpression extends PredicateExpression {
}
exports.ComparisonExpression = ComparisonExpression;
class LogicalBinaryExpression extends PredicateExpression {
}
exports.LogicalBinaryExpression = LogicalBinaryExpression;
class NotExpression extends PredicateExpression {
}
exports.NotExpression = NotExpression;
class ExpressionVisitor {
    visitSelectExpression(expression) {
        this.visitFromExpression(expression.from);
        for (var join of expression.joins)
            this.visitJoinExpression(join);
    }
    visitSetExpression(expression) {
        if (expression instanceof NamedSetExpression)
            this.visitNamedExpression(expression);
        else if (expression instanceof QueriedSetExpression)
            this.visitQueriedExpression(expression);
        else
            this.unconsidered();
    }
    visitQueriedExpression(expression) {
        this.visitSelectExpression(expression.definition);
    }
    visitNamedExpression(expression) { this.unconsidered(); }
    visitScalarExpression(expression) {
        if (expression instanceof BindingExpression)
            this.visitBindingExpression(expression);
        else
            this.unconsidered();
    }
    visitBindingExpression(expression) {
        if (expression instanceof FromExpression)
            this.visitFromExpression(expression);
        else if (expression instanceof JoinExpression)
            this.visitJoinExpression(expression);
        else
            this.unconsidered();
    }
    visitFromExpression(expression) { this.unconsidered(); }
    visitJoinExpression(expression) { this.unconsidered(); }
    visitPredicateExpression(expression) { this.unconsidered(); }
    unconsidered() { }
}
function setWeights(run) {
    var weight = 0;
    for (var r of run.children) {
        if (typeof (r) === "string")
            weight += r.length;
        else {
            setWeights(r);
            if (!r.weight)
                throw "Something's off";
            weight += r.weight;
        }
    }
    run.weight = weight;
}
function stringify(run) {
    var parts = [];
    function strigifyImpl(run) {
        for (var r of run.children) {
            if (typeof (r) === "string")
                parts.push(r);
            else {
                strigifyImpl(r);
            }
        }
    }
    strigifyImpl(run);
    return parts.join(" ");
}
class BindingCollectorVisitor extends ExpressionVisitor {
    constructor() {
        super(...arguments);
        this.bindingExpressions = [];
    }
    static getBindings(expression) {
        var self = new BindingCollectorVisitor();
        self.visitSetExpression(expression);
        return self.bindingExpressions;
    }
    visitFromExpression(expression) {
        console.info("here");
        this.bindingExpressions.push(expression);
    }
    visitJoinExpression(expression) {
        console.info("here");
        this.bindingExpressions.push(expression);
    }
}
var collectBindings = BindingCollectorVisitor.getBindings;
function createIdentifiers(bindings) {
    function suggestIdentifier(bindingExpression) {
        var setExpression = bindingExpression.source;
        if (setExpression instanceof NamedSetExpression) {
            return setExpression.name;
        }
        else if (setExpression instanceof QueriedSetExpression) {
            return 'subquery';
        }
        else {
            return 'unknown';
        }
    }
    var identifiersNeedingQualification = new Map();
    var madeIdentifiers = new Set();
    for (var binding of bindings) {
        var suggestion = suggestIdentifier(binding);
        if (madeIdentifiers.has(suggestion) && !identifiersNeedingQualification.has(suggestion)) {
            identifiersNeedingQualification.set(suggestion, 0);
        }
    }
    var identifiers = new Map();
    for (var binding of bindings) {
        var suggestion = suggestIdentifier(binding);
        var count = identifiersNeedingQualification.get(suggestion);
        if (typeof count === 'undefined') {
            identifiers.set(binding, suggestion);
        }
        else {
            identifiers.set(binding, suggestion + count);
            identifiersNeedingQualification.set(suggestion, count + 1);
        }
    }
    return identifiers;
}
class SerializerVisitor extends ExpressionVisitor {
    constructor(identifiers) {
        super();
        this.identifiers = identifiers;
        this.stack = [];
    }
    GetTokenTree(expression) {
        var result;
        this.run(() => {
            this.visitSetExpression(expression);
            if (!this.stack || this.stack.length !== 1)
                throw "Something's off";
            result = this.stack[0];
        });
        return result;
    }
    visitSelectExpression(expression) {
        this.run(() => {
            this.write('SELECT');
            this.visitFromExpression(expression.from);
        });
        this.run(() => {
            for (var join of expression.joins) {
                this.run(() => this.visitJoinExpression(join));
            }
        });
    }
    visitFromExpression(expression) {
        this.run(() => {
            this.write('FROM');
            this.visitSetExpression(expression.source);
            var identifier = this.identifiers ? this.identifiers.get(expression) : undefined;
            this.write(identifier ? identifier : '*');
        });
    }
    visitJoinExpression(expression) {
        this.run(() => {
            this.write(expression.kind);
            this.visitSetExpression(expression.source);
            var identifier = this.identifiers ? this.identifiers.get(expression) : undefined;
            this.write(identifier ? identifier : '*');
        });
        this.run(() => {
            this.write('ON');
            this.visitPredicateExpression(expression.on);
        });
    }
    visitQueriedExpression(expression) {
        this.write('(');
        this.run(() => {
            this.visitSelectExpression(expression.definition);
        });
        this.write(')');
    }
    visitNamedExpression(expression) {
        this.write(expression.name);
    }
    visitPredicateExpression(expression) {
        this.write('bla');
    }
    run(nested) {
        var previousRun = this.stack[this.stack.length - 1];
        var newRun = { children: [] };
        this.stack.push(newRun);
        try {
            nested();
        }
        finally {
            if (this.stack.pop() !== newRun)
                throw "Unexpected top frame";
            if (this.stack[this.stack.length - 1] !== previousRun)
                throw "Unexpected top frame 2";
            if (previousRun)
                previousRun.children.push(newRun);
        }
    }
    write(text) {
        var run = this.stack[this.stack.length - 1];
        if (!run)
            throw "Token has nothing opened to go to";
        run.children.push(text);
    }
}
function sqlify(source) {
    var bindings = collectBindings(source);
    var identifiers = createIdentifiers(bindings);
    var visitor = new SerializerVisitor(identifiers);
    var tokenTree = visitor.GetTokenTree(source);
    if (!tokenTree)
        throw "Internal error";
    setWeights(tokenTree);
    return stringify(tokenTree);
}
exports.sqlify = sqlify;
//# sourceMappingURL=expression.js.map