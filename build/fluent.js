"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const expression_1 = require("./expression");
class ConcreteScalar {
    constructor() {
    }
}
var SqlTrue;
class SqlSet {
}
exports.SqlSet = SqlSet;
class ConcreteSqlSet extends SqlSet {
}
function immediate(value) { throw null; }
var x = scalar;
function makeAliasedSetExpression(source) {
    var aliased = new expression_1.AliasedSetExpression();
    aliased.set = getSetExpression(source);
    return aliased;
}
function from(source) {
    var evaluation = getCurrentEvaluation();
    evaluation.expression.from = makeAliasedSetExpression(source);
    return new ConcreteScalar();
}
exports.from = from;
function join(source, condition) {
    var evaluation = getCurrentEvaluation();
    var joinExpression = new expression_1.JoinExpression();
    joinExpression.source = makeAliasedSetExpression(source);
    joinExpression.kind = 'join';
    evaluation.expression.joins.push(joinExpression);
    return new ConcreteScalar();
}
exports.join = join;
var evaluationStack = [];
function getCurrentEvaluation() {
    return evaluationStack[evaluationStack.length - 1];
}
exports.query = (monad) => {
    evaluationStack.push({ expression: new expression_1.SelectExpression() });
    try {
        var result = monad();
        var evaluation = getCurrentEvaluation();
        return new ConcreteSqlSet();
    }
    finally {
        evaluationStack.pop();
    }
};
//# sourceMappingURL=fluent.js.map