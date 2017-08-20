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
//# sourceMappingURL=app.js.map

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const expression_1 = __webpack_require__(0);
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
//# sourceMappingURL=fluent.js.map

/***/ })
/******/ ]);