"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AliasedSetExpression {
}
exports.AliasedSetExpression = AliasedSetExpression;
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
}
exports.SelectExpression = SelectExpression;
class JoinExpression {
}
exports.JoinExpression = JoinExpression;
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
class AtomExpression extends ScalarExpression {
}
exports.AtomExpression = AtomExpression;
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
//# sourceMappingURL=expression.js.map