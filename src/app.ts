import { sqlify } from './expression';
import { defineTable, from, join, query, SqlSet } from './fluent';
import * as tape from 'tape';

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



class Entity {
    name: string
    age = 32
    city: City
}

class City {
    name: string
}

var myEntities: SqlSet<Entity> = defineTable("myEntities");
var myCities: SqlSet<City> = defineTable("myCities");

var myEntity = new Entity();


var myQuery = query(() =>
{
    var x = from(myEntities);
    var y = join(myCities).on(c => x.city.name.eq(c.name));

    var p = { e: x, c: y }

    return p;
})

sqlify(myQuery.expression)

// tape('', t => {
// }
// )
