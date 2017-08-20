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
    constructor() {
        this.NotImplemented = "not implemented";
    }
    VisitSelectExpression(expression) { throw this.NotImplemented; }
    VisitSetExpression(expression) {
        if (expression instanceof NamedSetExpression)
            this.VisitNamedExpression(expression);
        else if (expression instanceof QueriedSetExpression)
            this.VisitQueriedExpression(expression);
        else
            throw this.NotImplemented;
    }
    VisitQueriedExpression(expression) { throw this.NotImplemented; }
    VisitNamedExpression(expression) { throw this.NotImplemented; }
    VisitScalarExpression(expression) {
        if (expression instanceof BindingExpression)
            this.VisitBindingExpression(expression);
        else
            throw this.NotImplemented;
    }
    VisitBindingExpression(expression) {
        if (expression instanceof FromExpression)
            this.VisitFromExpression(expression);
        else if (expression instanceof JoinExpression)
            this.VisitJoinExpression(expression);
        else
            throw this.NotImplemented;
    }
    VisitFromExpression(expression) { throw this.NotImplemented; }
    VisitJoinExpression(expression) { throw this.NotImplemented; }
    VisitPredicateExpression(expression) { throw this.NotImplemented; }
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
class SerializerVisitor extends ExpressionVisitor {
    constructor() {
        super(...arguments);
        this.stack = [];
    }
    GetTokenTree(expression) {
        var result;
        this.run(() => {
            this.VisitSetExpression(expression);
            if (!this.stack || this.stack.length !== 1)
                throw "Something's off";
            result = this.stack[0];
        });
        return result;
    }
    VisitSelectExpression(expression) {
        this.run(() => {
            this.write('SELECT');
            this.VisitFromExpression(expression.from);
        });
        this.run(() => {
            for (var join of expression.joins) {
                this.run(() => this.VisitJoinExpression(join));
            }
        });
    }
    VisitFromExpression(expression) {
        this.run(() => {
            this.write('FROM');
            this.VisitSetExpression(expression.source);
        });
    }
    VisitJoinExpression(expression) {
        this.run(() => {
            this.write(expression.kind);
            this.VisitSetExpression(expression.source);
        });
        this.run(() => {
            this.write('ON');
            this.VisitPredicateExpression(expression.on);
        });
    }
    VisitQueriedExpression(expression) {
        this.write('(');
        this.run(() => {
            this.VisitSelectExpression(expression.definition);
        });
        this.write(')');
    }
    VisitNamedExpression(expression) {
        this.write(expression.name);
    }
    VisitPredicateExpression(expression) {
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
    var visitor = new SerializerVisitor();
    var tokenTree = visitor.GetTokenTree(source);
    if (!tokenTree)
        throw "Internal error";
    setWeights(tokenTree);
    return stringify(tokenTree);
}
exports.sqlify = sqlify;
//# sourceMappingURL=expression.js.map