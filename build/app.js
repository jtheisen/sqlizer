"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fluent_1 = require("./fluent");
class Entity {
    constructor() {
        this.age = 32;
    }
}
class City {
}
var myEntities;
var myCities;
var myEntity = new Entity();
var myQuery = fluent_1.query(() => {
    var x = fluent_1.from(myEntities);
    var y = fluent_1.join(myCities, c => x.city.name.eq(c.name));
    var p = { e: x, c: y };
    return p;
});
//# sourceMappingURL=app.js.map