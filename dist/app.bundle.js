/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

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
    constructor(operator, lhs, rhs) {
        super();
        this.operator = operator;
        this.lhs = lhs;
        this.rhs = rhs;
    }
}
exports.ComparisonExpression = ComparisonExpression;
class IsNullOrNotExpression extends PredicateExpression {
    constructor(operand, isNull = true) {
        super();
        this.operand = operand;
        this.isNull = isNull;
    }
}
exports.IsNullOrNotExpression = IsNullOrNotExpression;
class IsInExpression extends PredicateExpression {
    constructor(lhs, rhs) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
    }
}
exports.IsInExpression = IsInExpression;
class ExistsExpression extends PredicateExpression {
    constructor(operand) {
        super();
        this.operand = operand;
    }
}
exports.ExistsExpression = ExistsExpression;
class LogicalBinaryExpression extends PredicateExpression {
    constructor(operator, lhs, rhs) {
        super();
        this.operator = operator;
        this.lhs = lhs;
        this.rhs = rhs;
    }
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
    visitNamedExpression(expression) { }
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
    visitFromExpression(expression) {
        this.visitSetExpression(expression.source);
    }
    visitJoinExpression(expression) {
        this.visitSetExpression(expression.source);
        this.visitPredicateExpression(expression.on);
    }
    visitPredicateExpression(expression) {
        if (expression instanceof ComparisonExpression)
            this.visitComparisonExpression(expression);
        else if (expression instanceof LogicalBinaryExpression)
            this.visitLogicalBinaryExpression(expression);
        else if (expression instanceof NotExpression)
            this.visitNotExpression(expression);
        else if (expression instanceof IsNullOrNotExpression)
            this.visitIsNullOrNotExpression(expression);
        else if (expression instanceof IsInExpression)
            this.visitIsInExpression(expression);
        else if (expression instanceof ExistsExpression)
            this.visitExistsExpression(expression);
        else
            this.unconsidered();
    }
    visitComparisonExpression(expression) {
        this.visitScalarExpression(expression.lhs);
        this.visitScalarExpression(expression.rhs);
    }
    visitLogicalBinaryExpression(expression) {
        this.visitPredicateExpression(expression.lhs);
        this.visitPredicateExpression(expression.rhs);
    }
    visitNotExpression(expression) {
        this.visitPredicateExpression(expression.operand);
    }
    visitIsNullOrNotExpression(expression) {
        this.visitScalarExpression(expression.operand);
    }
    visitIsInExpression(expression) {
        this.visitScalarExpression(expression.lhs);
        this.visitSetExpression(expression.rhs);
    }
    visitExistsExpression(expression) {
        this.visitSetExpression(expression.operand);
    }
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
        this.bindingExpressions.push(expression);
    }
    visitJoinExpression(expression) {
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
    visitComparisonExpression(expression) {
        this.visitScalarExpression(expression.lhs);
        this.write(expression.operator);
        this.visitScalarExpression(expression.rhs);
    }
    visitLogicalBinaryExpression(expression) {
        this.visitPredicateExpression(expression.lhs);
        this.write(expression.operator);
        this.visitPredicateExpression(expression.rhs);
    }
    visitNotExpression(expression) {
        this.write('NOT');
        this.visitPredicateExpression(expression.operand);
    }
    visitIsNullOrNotExpression(expression) {
        this.visitScalarExpression(expression.operand);
        this.write(expression.isNull ? 'IS NULL' : 'IS NOT NULL');
    }
    visitIsInExpression(expression) {
        this.visitScalarExpression(expression.lhs);
        this.visitSetExpression(expression.rhs);
    }
    visitExistsExpression(expression) {
        this.visitSetExpression(expression.operand);
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


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(2);


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const expression_1 = __webpack_require__(0);
const fluent_1 = __webpack_require__(3);
class Entity {
    constructor() {
        this.age = 32;
    }
}
class City {
}
var myEntities = fluent_1.defineTable("myEntities");
var myCities = fluent_1.defineTable("myCities");
var myEntity = new Entity();
var myQuery = fluent_1.query(() => {
    var x = fluent_1.from(myEntities);
    var y = fluent_1.join(myCities).on(c => x.city.name.eq(c.name));
    var p = { e: x, c: y };
    return p;
});
console.info(expression_1.sqlify(myQuery.expression));


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const expression_1 = __webpack_require__(0);
class ConcreteScalar {
    constructor(expression) {
        this.expression = expression;
    }
    eq(rhs) { return new Predicate(new expression_1.ComparisonExpression('=', this.expression, rhs.expression)); }
    ne(rhs) { return new Predicate(new expression_1.ComparisonExpression('<>', this.expression, rhs.expression)); }
    lt(rhs) { return new Predicate(new expression_1.ComparisonExpression('<', this.expression, rhs.expression)); }
    gt(rhs) { return new Predicate(new expression_1.ComparisonExpression('>', this.expression, rhs.expression)); }
    le(rhs) { return new Predicate(new expression_1.ComparisonExpression('<=', this.expression, rhs.expression)); }
    ge(rhs) { return new Predicate(new expression_1.ComparisonExpression('>=', this.expression, rhs.expression)); }
    isIn(rhs) { return new Predicate(new expression_1.IsInExpression(this.expression, rhs.expression)); }
}
class Predicate {
    constructor(expression) {
        this.expression = expression;
    }
    and(rhs) { return new Predicate(new expression_1.LogicalBinaryExpression('AND', this.expression, rhs.expression)); }
    or(rhs) { throw new Predicate(new expression_1.LogicalBinaryExpression('OR', this.expression, rhs.expression)); }
}
var SqlTrue;
class SqlSet {
    constructor(expression) {
        this.expression = expression;
    }
    any() { return new Predicate(new expression_1.ExistsExpression(this.expression)); }
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
        var setExpression = new expression_1.QueriedSetExpression();
        setExpression.definition = evaluation.expression;
        return new SqlSet(setExpression);
    }
    finally {
        evaluationStack.pop();
    }
};
function getSetExpression(source) {
    return source.expression;
}


/***/ })
/******/ ]);
//# sourceMappingURL=app.bundle.js.map