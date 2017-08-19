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
class PrintVisitor extends ExpressionVisitor {
    VisitSelectExpression(expression) {
        this.write('SELECT');
        this.VisitFromExpression(expression.from);
        for (var join of expression.joins)
            this.VisitJoinExpression(join);
    }
    VisitFromExpression(expression) {
        this.write('FROM');
        this.VisitSetExpression(expression.source);
    }
    VisitJoinExpression(expression) {
        this.write(expression.kind);
        this.VisitSetExpression(expression.source);
        this.write('ON');
        this.VisitPredicateExpression(expression.on);
    }
    VisitQueriedExpression(expression) {
        this.write('(');
        this.VisitSelectExpression(expression.definition);
        this.write(')');
    }
    VisitNamedExpression(expression) {
        this.write(expression.name);
    }
    VisitPredicateExpression(expression) {
        this.write('bla');
    }
    write(text) {
        console.info(text);
    }
}
function sqlify(source) {
    var visitor = new PrintVisitor();
    visitor.VisitSetExpression(source);
}
exports.sqlify = sqlify;
//# sourceMappingURL=expression.js.map