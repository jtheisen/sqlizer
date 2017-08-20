"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const expression_1 = require("./expression");
const fluent_1 = require("./fluent");
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