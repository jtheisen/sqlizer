"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const expression_1 = require("./expression");
class ConcreteScalar {
    constructor(set) {
        this.set = set;
    }
    add(rhs) { throw 0; }
    eq(rhs) { throw 0; }
}
class Predicate {
    and(rhs) { throw 0; }
    or(rhs) { throw 0; }
}
var SqlTrue;
class SqlSet {
    constructor(expression) {
        this.expression = expression;
    }
}
exports.SqlSet = SqlSet;
function defineTable(name) {
    var expression = new expression_1.NamedSetExpression();
    expression.name = name;
    return new SqlSet(expression);
}
exports.defineTable = defineTable;
function immediate(value) { throw null; }
var scalar = (e) => e;
function from(source) {
    var evaluation = getCurrentEvaluation();
    evaluation.expression.from = new expression_1.FromExpression();
    evaluation.expression.from.source = getSetExpression(source);
    return new ConcreteScalar(evaluation.expression.from.source);
}
exports.from = from;
function join(source) {
    return {
        on: (condition) => {
            var evaluation = getCurrentEvaluation();
            var joinExpression = new expression_1.JoinExpression();
            joinExpression.source = getSetExpression(source);
            joinExpression.kind = 'join';
            evaluation.expression.joins.push(joinExpression);
            return new ConcreteScalar(joinExpression.source);
        }
    };
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
        return new SqlSet(evaluation.expression);
    }
    finally {
        evaluationStack.pop();
    }
};
function getSetExpression(source) {
    return source.expression;
}
//# sourceMappingURL=fluent.js.map