import { MemberExpression, ScalarExpression, sqlify } from './expression';
import { asSet, defineTable, from, join, query, Scalar, SqlSet } from './fluent';
import { Table, defString } from './entities'
import * as tape from 'tape';
import 'reflect-metadata';

 

/*

We do *only* the monadic version at first. This is in fact easier (as the monadic expressions reflect
complete sql query units) and it's what I seek to prove possible anyway.

We now have two sets of types so far:
- Typed Scalar/SqlSet for fluid syntax and
- Untyped Expressions representing an intermediate form of the query

The expression already shows the structure the query will have (the number of subqueries, for example).
It does not yet, however, contain the following:
- There are no aliases in the expressions. Those will be given in the final render step.
- Implicit joins necessitated through accessing a scalar navigational property.
- Implicit applies?

*/

//var x: PropertyDescriptor


@Table
class City {
    name = defString()
}

@Table
class Entity {
    name?: string = defString()
    age = 32
}

var myEntities = defineTable("myEntities", new Entity());
var myCities = defineTable("myCities", new City());

// var myEntity = new Entity();


var temp = () => {
    var x = from(myEntities);
    //var y = join(myCities).on(c => x.name.eq(c.name).and(x.isIn(y.entities)));
    //var z = join(y.entities);

    // var p = { e: x, c: y }

    return { age: x.age, name: x.name };
}

var myQuery = query(temp)

// var y = () => {
//     var y = from(myQuery)
//     y.x.age.eq(y.x.age)
// }

console.info(sqlify(myQuery.expression))

// tape('', t => {
// }
// )
